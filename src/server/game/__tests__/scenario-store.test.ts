import { beforeEach, describe, expect, it } from 'vitest'

import {
  assignScenarioRole,
  getScenarioState,
  resetScenarioState,
  resetStore,
  submitScenarioSelections,
} from '../store'
import { setupScenarioGame } from './test-utils'

describe('scenario store helpers', () => {
  beforeEach(async () => {
    await resetStore()
  })

  it('prevents assigning the same idol to multiple roles for a player', async () => {
    const { code, game, host } = await setupScenarioGame()
    const scenarioResult = await getScenarioState(code)
    if (!scenarioResult.ok) {
      throw new Error('Expected scenario state to be available')
    }

    const scenario = scenarioResult.data.scenario
    expect(scenario).not.toBeNull()
    const roles = scenario?.roles ?? []
    expect(roles.length).toBeGreaterThan(1)

    const firstRole = roles[0]!
    const secondRole = roles[1]!

    const hostIdols = game.picks[host.id] ?? []
    expect(hostIdols.length).toBeGreaterThanOrEqual(2)
    const primaryIdol = hostIdols[0]!
    const alternateIdol = hostIdols[1]!

    const firstAssignment = await assignScenarioRole(
      code,
      host.id,
      firstRole.id,
      primaryIdol,
    )
    expect(firstAssignment.ok).toBe(true)

    const duplicateAssignment = await assignScenarioRole(
      code,
      host.id,
      secondRole.id,
      primaryIdol,
    )
    expect(duplicateAssignment.ok).toBe(false)
    if (duplicateAssignment.ok) {
      throw new Error('Duplicate assignment unexpectedly succeeded')
    }
    expect(duplicateAssignment.error.code).toBe('idol_in_use')

    const alternateAssignment = await assignScenarioRole(
      code,
      host.id,
      secondRole.id,
      alternateIdol,
    )
    expect(alternateAssignment.ok).toBe(true)
  })

  it('enters reveal state once every player submits selections', async () => {
    const { code, game, host, rival } = await setupScenarioGame()

    const scenarioResult = await getScenarioState(code)
    if (!scenarioResult.ok || !scenarioResult.data.scenario) {
      throw new Error('Unable to load initial scenario')
    }

    const scenario = scenarioResult.data.scenario

    for (const [index, role] of scenario.roles.entries()) {
      const hostIdol = game.picks[host.id]?.[index] ?? game.picks[host.id]?.[0]
      const rivalIdol =
        game.picks[rival.id]?.[index] ?? game.picks[rival.id]?.[0]
      if (!hostIdol || !rivalIdol) {
        throw new Error('Roster not initialised')
      }
      await assignScenarioRole(code, host.id, role.id, hostIdol)
      await assignScenarioRole(code, rival.id, role.id, rivalIdol)
    }

    const firstSubmit = await submitScenarioSelections(code, host.id)
    expect(firstSubmit.ok).toBe(true)
    if (!firstSubmit.ok) {
      throw new Error(`Host submission failed: ${firstSubmit.error.message}`)
    }
    expect(firstSubmit.data.status).toBe('scenario')

    const secondSubmit = await submitScenarioSelections(code, rival.id)
    expect(secondSubmit.ok).toBe(true)
    if (!secondSubmit.ok) {
      throw new Error(`Rival submission failed: ${secondSubmit.error.message}`)
    }
    expect(secondSubmit.data.status).toBe('reveal')
    expect(secondSubmit.data.revealedAt).toBeDefined()
  })

  it('resets state and advances to the next scenario', async () => {
    const { code, game, host, rival } = await setupScenarioGame()

    const scenarioResult = await getScenarioState(code)
    if (!scenarioResult.ok || !scenarioResult.data.scenario) {
      throw new Error('Unable to load scenario state')
    }

    const scenario = scenarioResult.data

    for (const [index, role] of scenario.scenario?.roles.entries() ?? []) {
      const hostIdol = game.picks[host.id]?.[index] ?? game.picks[host.id]?.[0]
      const rivalIdol =
        game.picks[rival.id]?.[index] ?? game.picks[rival.id]?.[0]
      if (!hostIdol || !rivalIdol) {
        throw new Error('Missing roster data')
      }
      await assignScenarioRole(code, host.id, role.id, hostIdol)
      await assignScenarioRole(code, rival.id, role.id, rivalIdol)
    }

    await submitScenarioSelections(code, host.id)
    await submitScenarioSelections(code, rival.id)

    const resetResult = await resetScenarioState(code, { advance: true })
    expect(resetResult.ok).toBe(true)
    if (!resetResult.ok) {
      throw new Error(`Reset scenario failed: ${resetResult.error.message}`)
    }
    expect(resetResult.data.status).toBe('scenario')
    expect(resetResult.data.currentScenarioIndex).toBe(
      scenario.currentScenarioIndex + 1,
    )
    Object.values(resetResult.data.submissionState).forEach((value) => {
      expect(value).toBe('pending')
    })
  })
})
