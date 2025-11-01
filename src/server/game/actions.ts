'use server'

import {
  createGame,
  getAllCards,
  getGame,
  joinGame,
  startDraft,
  submitPick,
} from './store'

export async function createGameAction(displayName: string) {
  return createGame(displayName)
}

export async function joinGameAction(code: string, displayName: string) {
  return joinGame(code, displayName)
}

export async function startDraftAction(code: string, playerId: string) {
  return startDraft(code, playerId)
}

export async function submitPickAction(
  code: string,
  playerId: string,
  cardId: string,
) {
  return submitPick(code, playerId, cardId)
}

export async function getGameAction(code: string) {
  return getGame(code)
}

export async function getCardsAction() {
  return getAllCards()
}
