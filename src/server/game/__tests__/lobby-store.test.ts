import { beforeEach, describe, expect, it } from 'vitest'

import {
  createGame,
  joinGame,
  resetStore,
  startDraft,
  submitPick,
} from '../store'
import { MAX_PLAYERS, PICKS_PER_PLAYER } from '../types'

describe('lobby and draft store helpers', () => {
  beforeEach(async () => {
    await resetStore()
  })

  it('creates a lobby with a host player and generated code', async () => {
    const result = await createGame('Host Player')
    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error(result.error.message)
    }

    const { game, player } = result.data
    expect(game.status).toBe('lobby')
    expect(game.players).toHaveLength(1)
    expect(player.isCreator).toBe(true)
    expect(game.code).toMatch(/^[A-Z0-9]{6}$/)
    expect(game.availableCardIds.length).toBeGreaterThan(0)
    expect(game.picks[player.id]).toEqual([])
  })

  it('allows players to join until the lobby is full and rejects duplicates', async () => {
    const host = await createGame('Leader')
    if (!host.ok) throw new Error(host.error.message)
    const code = host.data.game.code

    const joinOne = await joinGame(code, 'Member One')
    expect(joinOne.ok).toBe(true)

    const duplicate = await joinGame(code, 'Member One')
    expect(duplicate.ok).toBe(false)
    if (duplicate.ok) throw new Error('duplicate name should fail')
    expect(duplicate.error.code).toBe('duplicate_name')

    for (let index = 2; index < MAX_PLAYERS; index += 1) {
      const join = await joinGame(code, `Member ${index}`)
      expect(join.ok).toBe(true)
    }

    const overflow = await joinGame(code, 'Overflow')
    expect(overflow.ok).toBe(false)
    if (overflow.ok) throw new Error('overflow should fail')
    expect(overflow.error.code).toBe('lobby_full')
  })

  it('requires two players before starting the draft and sets turn order', async () => {
    const host = await createGame('Host')
    if (!host.ok) throw new Error(host.error.message)

    const startTooSoon = await startDraft(host.data.game.code, host.data.player.id)
    expect(startTooSoon.ok).toBe(false)
    if (startTooSoon.ok) throw new Error('should not allow draft with one player')

    const join = await joinGame(host.data.game.code, 'Guest')
    if (!join.ok) throw new Error(join.error.message)

    const started = await startDraft(host.data.game.code, host.data.player.id)
    expect(started.ok).toBe(true)
    if (!started.ok) throw new Error(started.error.message)

    const game = started.data
    expect(game.status).toBe('drafting')
    expect(game.turnOrder).toHaveLength(game.players.length * PICKS_PER_PLAYER)
    expect(game.activePickIndex).toBe(0)
    expect(game.players.every((player) => player.seat !== null)).toBe(true)
  })

  it('enforces snake order picking and transitions into the scenario room', async () => {
    const host = await createGame('Host')
    if (!host.ok) throw new Error(host.error.message)
    const code = host.data.game.code
    const hostId = host.data.player.id

    const join = await joinGame(code, 'Rival')
    if (!join.ok) throw new Error(join.error.message)
    const rivalId = join.data.player.id

    const startResult = await startDraft(code, hostId)
    if (!startResult.ok) throw new Error(startResult.error.message)

    let draftState = startResult.data
    const initialDeckSize = draftState.availableCardIds.length

    const blockedCard = draftState.availableCardIds[0]
    if (!blockedCard) {
      throw new Error('Expected deck to contain cards after starting draft')
    }

    const firstPlayerId = draftState.turnOrder[0]
    const outOfTurnPlayer = firstPlayerId === rivalId ? hostId : rivalId
    const outOfTurn = await submitPick(code, outOfTurnPlayer, blockedCard)
    expect(outOfTurn.ok).toBe(false)
    if (outOfTurn.ok) throw new Error('out of turn pick should fail')
    expect(outOfTurn.error.code).toBe('out_of_turn')

    const firstActivePlayer = draftState.turnOrder[draftState.activePickIndex]
    const firstPickId = draftState.availableCardIds[0]
    if (!firstPickId) {
      throw new Error('No card available for the opening pick')
    }
    const firstPick = await submitPick(code, firstActivePlayer, firstPickId)
    expect(firstPick.ok).toBe(true)
    if (!firstPick.ok) throw new Error(firstPick.error.message)
    draftState = firstPick.data
    expect(draftState.picks[firstActivePlayer]).toContain(firstPickId)
    
    while (draftState.status === 'drafting') {
      const activePlayer = draftState.turnOrder[draftState.activePickIndex]
      if (!activePlayer) {
        throw new Error('Active player not resolved for current turn')
      }
      const cardId = draftState.availableCardIds[0]
      if (!cardId) {
        throw new Error('No card available for drafting turn')
      }
      const pick = await submitPick(code, activePlayer, cardId)
      expect(pick.ok).toBe(true)
      if (!pick.ok) throw new Error(pick.error.message)
      draftState = pick.data
    }

    expect(draftState.status).toBe('scenario')
    const totalDrafted = Object.values(draftState.picks).reduce(
      (sum, picks) => sum + picks.length,
      0,
    )
    expect(totalDrafted).toBe(draftState.turnOrder.length)
    expect(draftState.availableCardIds.length).toBe(initialDeckSize - totalDrafted)
  })
})
