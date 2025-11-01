'use server'

import { randomUUID } from 'node:crypto'

import idolCardSeed from '@/data/idolCards.json'

import type { Game, GameResult, IdolCard, Player, LobbyError } from './types'
import { MAX_PLAYERS, PICKS_PER_PLAYER } from './types'

const globalStore = globalThis as unknown as {
  __kpopDraftGames?: Map<string, Game>
  __kpopDraftCardLibrary?: Map<string, IdolCard>
  __kpopDraftDeckTemplate?: string[]
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

export async function getCardById(cardId: string) {
  return cardLibrary.get(cardId)
}

export async function getAllCards() {
  return Array.from(cardLibrary.values())
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
    createdAt: Date.now(),
  }

  gameStore.set(code, game)

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

  game.activePickIndex += 1

  if (game.activePickIndex >= game.turnOrder.length) {
    game.status = 'complete'
    game.completedAt = Date.now()
  }

  return {
    ok: true,
    data: cloneGame(game),
  } satisfies GameResult<Game>
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

function buildSnakeOrder(playerIds: string[]) {
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

function cloneGame(game: Game): Game {
  return structuredClone(game)
}

function errorResult(code: string, message: string): GameResult<never> {
  return {
    ok: false,
    error: { code, message },
  }
}
