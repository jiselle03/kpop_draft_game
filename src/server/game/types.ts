export const MAX_PLAYERS = 6
export const PICKS_PER_PLAYER = 8

export type GameStatus = 'lobby' | 'locked' | 'drafting' | 'complete'

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
