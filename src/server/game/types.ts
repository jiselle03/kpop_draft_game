export const MAX_PLAYERS = 6
export const PICKS_PER_PLAYER = 8

export type GameStatus =
  | 'lobby'
  | 'locked'
  | 'drafting'
  | 'scenario'
  | 'reveal'
  | 'complete'

export interface IdolCard {
  id: string
  name: string
  group: string
  imageUrl?: string
}

export interface Player {
  id: string
  name: string
  seat: number | null
  isCreator: boolean
  joinedAt: number
}

export type ScenarioSubmissionStatus = 'pending' | 'submitted'

export interface ScenarioRole {
  id: string
  label: string
  description?: string
  allowDuplicateIdols?: boolean
}

export interface Scenario {
  id: string
  title: string
  prompt: string
  roles: ScenarioRole[]
  imageUrl?: string
}

export type ScenarioAssignments = Record<string, Record<string, string>>

export interface Game {
  id: string
  code: string
  status: GameStatus
  creatorId: string
  players: Player[]
  turnOrder: string[]
  activePickIndex: number
  picks: Record<string, string[]>
  availableCardIds: string[]
  scenarios: Scenario[]
  currentScenarioIndex: number
  roleAssignments: ScenarioAssignments
  submissionState: Record<string, ScenarioSubmissionStatus>
  scenarioRevealedAt?: number
  scenarioUpdatedAt?: number
  createdAt: number
  lockedAt?: number
  completedAt?: number
}

export interface GameSummary {
  game: Game
  player?: Player
}

export interface LobbyError {
  code: string
  message: string
}

export type GameResult<TData = void> =
  | { ok: true; data: TData }
  | { ok: false; error: LobbyError }

export interface ScenarioSnapshot {
  code: string
  scenario: Scenario | null
  currentScenarioIndex: number
  totalScenarios: number
  roleAssignments: ScenarioAssignments
  submissionState: Record<string, ScenarioSubmissionStatus>
  status: Extract<GameStatus, 'scenario' | 'reveal'>
  revealedAt?: number
  updatedAt: number
}
