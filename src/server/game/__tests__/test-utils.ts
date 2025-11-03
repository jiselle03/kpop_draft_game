import {
  createGame,
  joinGame,
  startDraft,
  submitPick,
} from '../store'
import type { Game, Player } from '../types'

export async function setupScenarioGame(): Promise<{
  code: string
  game: Game
  host: Player
  rival: Player
}> {
  const hostResult = await createGame('Host Player')
  if (!hostResult.ok) {
    throw new Error('Failed to create host game')
  }

  const {
    game: initialGame,
    player: hostPlayer,
  } = hostResult.data

  const joinResult = await joinGame(initialGame.code, 'Rival Player')
  if (!joinResult.ok) {
    throw new Error('Failed to join second player')
  }
  const { player: rivalPlayer } = joinResult.data

  const startResult = await startDraft(initialGame.code, hostPlayer.id)
  if (!startResult.ok) {
    throw new Error('Failed to start draft')
  }

  let gameState = startResult.data

  for (const current of gameState.turnOrder) {
    const pickId = gameState.availableCardIds[0]
    if (!pickId) {
      throw new Error('No cards available for drafting')
    }
    const pickResult = await submitPick(initialGame.code, current, pickId)
    if (!pickResult.ok) {
      throw new Error('Failed to submit pick')
    }
    gameState = pickResult.data
  }

  return {
    code: initialGame.code,
    game: gameState,
    host: hostPlayer,
    rival: rivalPlayer,
  } as const
}
