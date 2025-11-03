'use server'

import {
  assignScenarioRole,
  createGame,
  joinGame,
  resetScenarioState,
  startDraft,
  submitScenarioSelections,
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

export async function assignScenarioRoleAction(
  code: string,
  playerId: string,
  roleId: string,
  idolId: string,
) {
  return assignScenarioRole(code, playerId, roleId, idolId)
}

export async function submitScenarioSelectionsAction(
  code: string,
  playerId: string,
) {
  return submitScenarioSelections(code, playerId)
}

export async function resetScenarioStateAction(
  code: string,
  options: { advance?: boolean } = {},
) {
  return resetScenarioState(code, options)
}
