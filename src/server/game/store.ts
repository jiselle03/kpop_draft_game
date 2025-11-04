'use server'

import { randomUUID } from 'node:crypto'

import idolCardSeed from '@/data/idolCards.json'
import scenarioSeed from '@/data/scenarios.json'

import type {
  Game,
  GameResult,
  IdolCard,
  LobbyError,
  Player,
  Scenario,
  ScenarioAssignments,
  ScenarioSnapshot,
  ScenarioSubmissionStatus,
} from './types'
import { MAX_PLAYERS, PICKS_PER_PLAYER } from './types'

type GameBroadcastPayload = {
  game: Game
  scenario: ScenarioSnapshot | null
  cards: IdolCard[]
}

type GameSubscriber = (payload: GameBroadcastPayload) => void

const globalStore = globalThis as unknown as {
  __kpopDraftGames?: Map<string, Game>
  __kpopDraftCardLibrary?: Map<string, IdolCard>
  __kpopDraftDeckTemplate?: string[]
  __kpopDraftSubscribers?: Map<string, Set<GameSubscriber>>
}

globalStore.__kpopDraftGames ??= new Map<string, Game>()
const gameStore = globalStore.__kpopDraftGames

const initialLibrary = globalStore.__kpopDraftCardLibrary
const initialDeck = globalStore.__kpopDraftDeckTemplate
if (!initialLibrary || !initialDeck) {
  const seeded = initialiseCardLibrary()
  globalStore.__kpopDraftCardLibrary = seeded.library
  globalStore.__kpopDraftDeckTemplate = seeded.deckTemplate
}

const cardLibrary = globalStore.__kpopDraftCardLibrary!
const deckTemplate = globalStore.__kpopDraftDeckTemplate!
const subscriberStore =
  (globalStore.__kpopDraftSubscribers ??= new Map<
    string,
    Set<GameSubscriber>
  >())

const scenarioTemplates = (scenarioSeed as Scenario[]).map((scenario) => ({
  ...scenario,
  roles: scenario.roles.map((role) => ({ ...role })),
}))

export async function getCardById(cardId: string) {
  return cardLibrary.get(cardId)
}

export async function getAllCards() {
  return buildCardCatalog()
}

export async function createGame(name: string) {
  const sanitised = sanitizeName(name)
  if (!sanitised.success) {
    return {
      ok: false,
      error: sanitised.error,
    } satisfies GameResult<{ game: Game; player: Player }>
  }

  const code = generateGameCode()
  const gameId = randomUUID()
  const player: Player = {
    id: randomUUID(),
    name: sanitised.value,
    seat: null,
    isCreator: true,
    joinedAt: Date.now(),
  }

  const picks: Record<string, string[]> = { [player.id]: [] }

  const game: Game = {
    id: gameId,
    code,
    status: 'lobby',
    creatorId: player.id,
    players: [player],
    turnOrder: [],
    activePickIndex: -1,
    picks,
    availableCardIds: createDeck(),
    scenarios: [],
    currentScenarioIndex: 0,
    roleAssignments: {},
    submissionState: {},
    scenarioRevealedAt: undefined,
    scenarioUpdatedAt: Date.now(),
    createdAt: Date.now(),
  }

  gameStore.set(code, game)
  await notifyGameUpdate(game)

  return {
    ok: true,
    data: {
      game: cloneGame(game),
      player: { ...player },
    },
  } satisfies GameResult<{ game: Game; player: Player }>
}

export async function joinGame(code: string, name: string) {
  const normalizedCode = code.trim().toUpperCase()
  if (!/^[A-Z0-9]{6}$/.test(normalizedCode)) {
    return errorResult(
      'invalid_code',
      'Game code must be six characters (letters or numbers).',
    )
  }

  const sanitizedName = sanitizeName(name)
  if (!sanitizedName.success) {
    return {
      ok: false,
      error: sanitizedName.error,
    } satisfies GameResult<{ game: Game; player: Player }>
  }

  const game = gameStore.get(normalizedCode)
  if (!game) {
    return errorResult('not_found', "We couldn't find a lobby with that code.")
  }

  if (game.status !== 'lobby') {
    const stateCopy = game.status === 'drafting' ? 'already drafting' : 'locked'
    return errorResult(
      'lobby_locked',
      `This lobby is ${stateCopy}. Ask the host for a new code.`,
    )
  }

  if (game.players.length >= MAX_PLAYERS) {
    return errorResult(
      'lobby_full',
      'This lobby already has the maximum number of players.',
    )
  }

  const trimmed = sanitizedName.value
  const duplicate = game.players.find(
    (player) => player.name.toLowerCase() === trimmed.toLowerCase(),
  )
  if (duplicate) {
    return errorResult(
      'duplicate_name',
      'Someone in this lobby is already using that display name.',
    )
  }

  const player: Player = {
    id: randomUUID(),
    name: trimmed,
    seat: null,
    isCreator: false,
    joinedAt: Date.now(),
  }

  game.players.push(player)
  game.picks[player.id] = []
  game.scenarioUpdatedAt = Date.now()
  await notifyGameUpdate(game)

  return {
    ok: true,
    data: {
      game: cloneGame(game),
      player: { ...player },
    },
  } satisfies GameResult<{ game: Game; player: Player }>
}

export async function startDraft(code: string, playerId: string) {
  const normalizedCode = code.trim().toUpperCase()
  const game = gameStore.get(normalizedCode)
  if (!game) {
    return errorResult('not_found', 'Lobby not found.')
  }

  if (game.status !== 'lobby') {
    return errorResult(
      'invalid_state',
      'Draft has already started for this lobby.',
    )
  }

  if (game.creatorId !== playerId) {
    return errorResult(
      'not_creator',
      'Only the lobby creator can start the draft.',
    )
  }

  if (game.players.length < 2) {
    return errorResult(
      'not_enough_players',
      'You need at least two players before drafting can begin.',
    )
  }

  const seating = assignSeats(game.players)
  const turnOrder = buildSnakeOrder(seating.map((player) => player.id))

  game.players = seating
  game.turnOrder = turnOrder
  game.activePickIndex = 0
 game.status = 'drafting'
 game.lockedAt = Date.now()
 game.scenarioUpdatedAt = Date.now()
  await notifyGameUpdate(game)

  return {
    ok: true,
    data: cloneGame(game),
  } satisfies GameResult<Game>
}

export async function submitPick(code: string, playerId: string, cardId: string) {
  const normalizedCode = code.trim().toUpperCase()
  const game = gameStore.get(normalizedCode)
  if (!game) {
    return errorResult('not_found', 'Lobby not found.')
  }

  if (game.status !== 'drafting') {
    return errorResult(
      'invalid_state',
      game.status === 'complete'
        ? 'The draft is already complete.'
        : "The draft hasn't started yet.",
    )
  }

  const expectedPlayerId = game.turnOrder[game.activePickIndex]

  if (expectedPlayerId !== playerId) {
    return errorResult('out_of_turn', "It's not your turn to pick yet.")
  }

  if (!game.availableCardIds.includes(cardId)) {
    return errorResult(
      'card_unavailable',
      'That idol has already been drafted.',
    )
  }

  game.availableCardIds = game.availableCardIds.filter((id) => id !== cardId)
  game.picks[playerId]?.push(cardId)
  game.scenarioUpdatedAt = Date.now()

  game.activePickIndex += 1

  if (game.activePickIndex >= game.turnOrder.length) {
    game.status = 'scenario'
    game.completedAt = Date.now()
    prepareScenarioRound(game, { resetSubmissions: true })
  }

  await notifyGameUpdate(game)

  return {
    ok: true,
    data: cloneGame(game),
  } satisfies GameResult<Game>
}

export async function getScenarioState(code: string) {
  const normalizedCode = code.trim().toUpperCase()
  const game = gameStore.get(normalizedCode)

  if (!game) {
    return errorResult('not_found', 'Lobby not found.') satisfies GameResult<
      ScenarioSnapshot
    >
  }

  syncScenarioState(game)

  return {
    ok: true,
    data: buildScenarioSnapshot(game),
  } satisfies GameResult<ScenarioSnapshot>
}

export async function assignScenarioRole(
  code: string,
  playerId: string,
  roleId: string,
  idolId: string,
) {
  const normalizedCode = code.trim().toUpperCase()
  const game = gameStore.get(normalizedCode)

  if (!game) {
    return errorResult('not_found', 'Lobby not found.') satisfies GameResult<
      ScenarioSnapshot
    >
  }

  syncScenarioState(game)

  if (game.status === 'reveal') {
    return errorResult(
      'scenario_revealed',
      'Selections are locked once the reveal begins.',
    ) satisfies GameResult<ScenarioSnapshot>
  }

  if (game.status !== 'scenario') {
    return errorResult(
      'invalid_state',
      'Scenario assignments are not active yet.',
    ) satisfies GameResult<ScenarioSnapshot>
  }

  if (game.scenarios.length === 0) {
    return errorResult(
      'scenario_unavailable',
      'Scenario data is not available yet.',
    ) satisfies GameResult<ScenarioSnapshot>
  }

  const scenario = game.scenarios[game.currentScenarioIndex]
  if (!scenario) {
    return errorResult(
      'scenario_unavailable',
      'Scenario data is not available yet.',
    ) satisfies GameResult<ScenarioSnapshot>
  }
  const role = scenario.roles.find((entry) => entry.id === roleId)
  if (!role) {
    return errorResult('invalid_role', 'We could not find that scenario role.')
  }

  const player = game.players.find((entry) => entry.id === playerId)
  if (!player) {
    return errorResult(
      'invalid_player',
      'We could not verify your lobby membership.',
    ) satisfies GameResult<ScenarioSnapshot>
  }

  if (game.submissionState[playerId] === 'submitted') {
    return errorResult(
      'scenario_locked',
      'Your selections are already submitted.',
    ) satisfies GameResult<ScenarioSnapshot>
  }

  const draftedIds = new Set(game.picks[playerId] ?? [])
  if (!draftedIds.has(idolId)) {
    return errorResult(
      'invalid_idol',
      'You can only assign idols from your drafted roster.',
    ) satisfies GameResult<ScenarioSnapshot>
  }

  if (!role.allowDuplicateIdols) {
    const alreadyUsed = scenario.roles.some((entry) => {
      if (entry.id === roleId) {
        return false
      }
      return game.roleAssignments[entry.id]?.[playerId] === idolId
    })
    if (alreadyUsed) {
      return errorResult(
        'idol_in_use',
        'Each idol may only fill one role this round.',
      ) satisfies GameResult<ScenarioSnapshot>
    }
  }

  game.roleAssignments[roleId] ??= {}
 game.roleAssignments[roleId][playerId] = idolId
 game.scenarioUpdatedAt = Date.now()
  await notifyGameUpdate(game)

  return {
    ok: true,
    data: buildScenarioSnapshot(game),
  } satisfies GameResult<ScenarioSnapshot>
}

export async function submitScenarioSelections(code: string, playerId: string) {
  const normalizedCode = code.trim().toUpperCase()
  const game = gameStore.get(normalizedCode)

  if (!game) {
    return errorResult('not_found', 'Lobby not found.') satisfies GameResult<
      ScenarioSnapshot
    >
  }

  syncScenarioState(game)

  if (game.status === 'reveal') {
    return errorResult(
      'scenario_revealed',
      'The reveal has already started for this scenario.',
    ) satisfies GameResult<ScenarioSnapshot>
  }

  if (game.status !== 'scenario') {
    return errorResult(
      'invalid_state',
      'Submissions are only available during an active scenario.',
    ) satisfies GameResult<ScenarioSnapshot>
  }

  if (game.scenarios.length === 0) {
    return errorResult(
      'scenario_unavailable',
      'Scenario data is not available yet.',
    ) satisfies GameResult<ScenarioSnapshot>
  }

  const scenario = game.scenarios[game.currentScenarioIndex]
  if (!scenario) {
    return errorResult(
      'scenario_unavailable',
      'Scenario data is not available yet.',
    ) satisfies GameResult<ScenarioSnapshot>
  }

  const player = game.players.find((entry) => entry.id === playerId)
  if (!player) {
    return errorResult(
      'invalid_player',
      'We could not verify your lobby membership.',
    ) satisfies GameResult<ScenarioSnapshot>
  }

  if (game.submissionState[playerId] === 'submitted') {
    return {
      ok: true,
      data: buildScenarioSnapshot(game),
    } satisfies GameResult<ScenarioSnapshot>
  }

  const missingRole = scenario.roles.find((role) => {
    const assigned = game.roleAssignments[role.id]?.[playerId]
    return !assigned
  })

  if (missingRole) {
    return errorResult(
      'scenario_incomplete',
      `Assign an idol to the ${missingRole.label} role before submitting.`,
    ) satisfies GameResult<ScenarioSnapshot>
  }

  game.submissionState[playerId] = 'submitted'
  game.scenarioUpdatedAt = Date.now()

  if (allPlayersSubmitted(game)) {
    game.status = 'reveal'
    game.scenarioRevealedAt = Date.now()
    game.scenarioUpdatedAt = Date.now()
  }

  await notifyGameUpdate(game)

  return {
    ok: true,
    data: buildScenarioSnapshot(game),
  } satisfies GameResult<ScenarioSnapshot>
}

export async function resetScenarioState(
  code: string,
  options: { advance?: boolean } = {},
) {
  const normalizedCode = code.trim().toUpperCase()
  const game = gameStore.get(normalizedCode)

  if (!game) {
    return errorResult('not_found', 'Lobby not found.') satisfies GameResult<
      ScenarioSnapshot
    >
  }

  syncScenarioState(game)

  const ready = prepareScenarioRound(game, {
    advance: options.advance ?? false,
    resetSubmissions: true,
  })

  if (!ready) {
    return errorResult(
      'scenario_complete',
      'There are no more scenarios remaining.',
    ) satisfies GameResult<ScenarioSnapshot>
  }

  await notifyGameUpdate(game)

  return {
    ok: true,
    data: buildScenarioSnapshot(game),
  } satisfies GameResult<ScenarioSnapshot>
}

export async function getGame(code: string) {
  const normalizedCode = code.trim().toUpperCase()
  const game = gameStore.get(normalizedCode)

  if (!game) {
    return errorResult('not_found', 'Lobby not found.')
  }

  return {
    ok: true,
    data: cloneGame(game),
  } satisfies GameResult<Game>
}

export async function resetStore() {
  gameStore.clear()
}

type NameResult =
  | { success: true; value: string }
  | { success: false; error: LobbyError }

function sanitizeName(name: string): NameResult {
  const trimmed = name.trim()

  if (trimmed.length < 2 || trimmed.length > 20) {
    return {
      success: false,
      error: {
        code: 'invalid_name',
        message: 'Display names must be between 2 and 20 characters.',
      },
    }
  }

  return { success: true, value: trimmed }
}

function generateGameCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  let attempts = 0

  do {
    code = Array.from(
      { length: 6 },
      () => alphabet[Math.floor(Math.random() * alphabet.length)],
    ).join('')
    attempts += 1
  } while (gameStore.has(code) && attempts < 10)

  if (gameStore.has(code)) {
    // Fallback to uuid slice if we somehow collide too often
    return randomUUID()
      .replace(/[^A-Z0-9]/gi, '')
      .slice(0, 6)
      .toUpperCase()
  }

  return code
}

function assignSeats(players: Player[]) {
  const shuffled = shuffle(players)
  return shuffled.map((player, index) => ({
    ...player,
    seat: index + 1,
  }))
}

export function buildSnakeOrder(playerIds: string[]) {
  const rounds = PICKS_PER_PLAYER
  const order: string[] = []

  for (let round = 0; round < rounds; round += 1) {
    const ascending = round % 2 === 0
    const ids = ascending ? playerIds : [...playerIds].reverse()
    order.push(...ids)
  }

  return order
}

function shuffle<T>(input: T[]): T[] {
  const arr = [...input]
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = arr[i]!
    arr[i] = arr[j]!
    arr[j] = temp
  }
  return arr
}

function createDeck() {
  return [...deckTemplate]
}

function createScenarioDeck() {
  const templates = scenarioTemplates.map((scenario) => ({
    ...scenario,
    roles: scenario.roles.map((role) => ({ ...role })),
  }))
  return shuffle(templates)
}

function ensureScenarioDeck(game: Game) {
  if (!game.scenarios || game.scenarios.length === 0) {
    game.scenarios = createScenarioDeck()
    game.currentScenarioIndex = 0
  }

  if (game.currentScenarioIndex < 0) {
    game.currentScenarioIndex = 0
  }

  if (game.currentScenarioIndex >= game.scenarios.length) {
    game.currentScenarioIndex = Math.max(game.scenarios.length - 1, 0)
  }
}

function prepareScenarioRound(
  game: Game,
  options: { resetSubmissions?: boolean; advance?: boolean } = {},
): boolean {
  ensureScenarioDeck(game)

  if (game.scenarios.length === 0) {
    game.roleAssignments = {}
    game.submissionState = {}
    game.status = 'complete'
    game.scenarioUpdatedAt = Date.now()
    return false
  }

  if (options.advance) {
    if (game.currentScenarioIndex + 1 >= game.scenarios.length) {
      game.status = 'complete'
      game.scenarioRevealedAt = Date.now()
      game.scenarioUpdatedAt = Date.now()
      return false
    }
    game.currentScenarioIndex += 1
  } else if (
    game.currentScenarioIndex < 0 ||
    game.currentScenarioIndex >= game.scenarios.length
  ) {
    game.currentScenarioIndex = 0
  }

  const scenario = game.scenarios[game.currentScenarioIndex]
  game.roleAssignments = createEmptyAssignments(scenario)

  if (options.resetSubmissions ?? false) {
    game.submissionState = buildPlayerSubmissionState(game.players)
  } else {
    game.submissionState = ensureSubmissionState(
      game.players,
      game.submissionState,
    )
  }

  game.status = 'scenario'
  game.scenarioRevealedAt = undefined
  game.scenarioUpdatedAt = Date.now()
  return true
}

function syncScenarioState(game: Game) {
  ensureScenarioDeck(game)

  if (game.scenarios.length === 0) {
    return
  }

  const scenario = game.scenarios[game.currentScenarioIndex]
  const assignments: ScenarioAssignments = {}

  if (scenario) {
    for (const role of scenario.roles) {
      assignments[role.id] = { ...(game.roleAssignments[role.id] ?? {}) }
    }
  }

  game.roleAssignments = assignments
  game.submissionState = ensureSubmissionState(
    game.players,
    game.submissionState,
  )
  game.scenarioUpdatedAt ??= Date.now()
}

function buildScenarioSnapshot(game: Game): ScenarioSnapshot {
  ensureScenarioDeck(game)

  const scenario = game.scenarios[game.currentScenarioIndex] ?? null
  const roleAssignments: ScenarioAssignments = {}

  if (scenario) {
    for (const role of scenario.roles) {
      roleAssignments[role.id] = { ...(game.roleAssignments[role.id] ?? {}) }
    }
  }

  const submissionState = ensureSubmissionState(
    game.players,
    game.submissionState,
  )

  return {
    code: game.code,
    scenario,
    currentScenarioIndex:
      scenario && game.scenarios.length > 0 ? game.currentScenarioIndex : 0,
    totalScenarios: game.scenarios.length,
    roleAssignments,
    submissionState,
    status: game.status === 'reveal' ? 'reveal' : 'scenario',
    revealedAt: game.scenarioRevealedAt,
    updatedAt: game.scenarioUpdatedAt ?? Date.now(),
  }
}

function allPlayersSubmitted(game: Game) {
  return game.players.every(
    (player) => game.submissionState[player.id] === 'submitted',
  )
}

function createEmptyAssignments(
  scenario: Scenario | null | undefined,
): ScenarioAssignments {
  if (!scenario) {
    return {}
  }

  return scenario.roles.reduce<ScenarioAssignments>((acc, role) => {
    acc[role.id] = {}
    return acc
  }, {})
}

function buildPlayerSubmissionState(players: Player[]) {
  return ensureSubmissionState(players, {}, 'pending')
}

function ensureSubmissionState(
  players: Player[],
  current: Record<string, ScenarioSubmissionStatus>,
  defaultStatus: ScenarioSubmissionStatus = 'pending',
) {
  const state: Record<string, ScenarioSubmissionStatus> = {}

  for (const player of players) {
    state[player.id] = current[player.id] ?? defaultStatus
  }

  return state
}

function initialiseCardLibrary() {
  const library = new Map<string, IdolCard>()
  const deck: string[] = []
  const requiredCards = MAX_PLAYERS * PICKS_PER_PLAYER

  const baseCards = idolCardSeed as IdolCard[]

  let variant = 1
  while (deck.length < requiredCards) {
    for (const base of baseCards) {
      if (deck.length >= requiredCards) {
        break
      }

      const isFirstPass = variant === 1
      const id = isFirstPass ? base.id : `${base.id}-${variant}`
      const name = isFirstPass ? base.name : `${base.name} ${variant}`

      if (!library.has(id)) {
        library.set(id, {
          ...base,
          id,
          name,
        })
      }

      deck.push(id)
    }
    variant += 1
  }

  return { library, deckTemplate: deck }
}

export async function subscribeToGame(
  code: string,
  subscriber: GameSubscriber,
): Promise<() => void> {
  const normalized = code.trim().toUpperCase()
  const listeners = subscriberStore.get(normalized)
  if (listeners) {
    listeners.add(subscriber)
    return () => {
      listeners.delete(subscriber)
      if (listeners.size === 0) {
        subscriberStore.delete(normalized)
      }
    }
  }

  const next = new Set<GameSubscriber>([subscriber])
  subscriberStore.set(normalized, next)
  return () => {
    next.delete(subscriber)
    if (next.size === 0) {
      subscriberStore.delete(normalized)
    }
  }
}

export async function buildGameBroadcast(
  game: Game,
): Promise<GameBroadcastPayload> {
  syncScenarioState(game)
  return {
    game: cloneGame(game),
    scenario: buildScenarioSnapshot(game),
    cards: buildCardCatalog(),
  }
}

async function notifyGameUpdate(game: Game) {
  const listeners = subscriberStore.get(game.code)
  if (!listeners || listeners.size === 0) {
    return
  }

  const payload = await buildGameBroadcast(game)
  for (const listener of listeners) {
    try {
      listener(payload)
    } catch (error) {
      console.error('Game subscriber failed', error)
    }
  }
}

function cloneGame(game: Game): Game {
  return structuredClone(game)
}

function errorResult(code: string, message: string): GameResult<never> {
  return {
    ok: false,
    error: { code, message },
  }
}

function buildCardCatalog(): IdolCard[] {
  return Array.from(cardLibrary.values()).map((card) => ({ ...card }))
}
