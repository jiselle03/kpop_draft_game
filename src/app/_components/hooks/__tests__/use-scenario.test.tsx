import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest'
import {
  act,
  cleanup,
  renderHook,
  waitFor,
} from '@testing-library/react'

import { useScenario } from '../use-scenario'
import { getScenarioState, resetStore } from '@/server/game/store'
import { setupScenarioGame } from '@/server/game/__tests__/test-utils'

describe('useScenario', () => {
  let originalFetch: typeof fetch

  beforeEach(async () => {
    await resetStore()
    originalFetch = globalThis.fetch
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const requestUrl = (() => {
        if (typeof input === 'string') {
          return input
        }
        if (input instanceof URL) {
          return input.href
        }
        if (typeof Request !== 'undefined' && input instanceof Request) {
          return input.url
        }
        throw new Error('Unsupported fetch input')
      })()
      const match = /\/api\/game\/([^/]+)\/scenario/.exec(requestUrl)
      if (match) {
        const code = match[1]
        if (!code) {
          throw new Error('Request missing scenario code')
        }
        const result = await getScenarioState(code)
        const body = result.ok
          ? { ok: true, data: result.data }
          : { ok: false, error: result.error }
        const status = result.ok
          ? 200
          : result.error.code === 'not_found'
            ? 404
            : 400
        return new Response(JSON.stringify(body), {
          status,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      throw new Error(`Unhandled fetch for ${requestUrl}`)
    }) as typeof fetch
  })

  afterEach(() => {
    cleanup()
    globalThis.fetch = originalFetch
  })

  it('loads scenario data and applies assignments', async () => {
    const { code, game, host } = await setupScenarioGame()
    const hostId = host.id

    const { result } = renderHook(() =>
      useScenario(code, hostId, { pollIntervalMs: 0 }),
    )

    await waitFor(() => {
      expect(result.current.scenario?.scenario).toBeTruthy()
    })

    const role =
      result.current.scenario?.scenario?.roles[0] ?? null
    if (!role) {
      throw new Error('Scenario role not available')
    }
    const idolId = game.picks[hostId]?.[0]
    if (!idolId) {
      throw new Error('Host roster is empty')
    }

    await act(async () => {
      const response = await result.current.assignRole(role.id, idolId)
      expect(response.ok).toBe(true)
      if (!response.ok) {
        throw new Error(`Assignment failed: ${response.error.message}`)
      }
    })

    await waitFor(() => {
      expect(
        result.current.scenario?.roleAssignments[role.id]?.[hostId],
      ).toBe(idolId)
    })
  })

  it('surfaces assignment validation errors', async () => {
    const { code, game, host } = await setupScenarioGame()
    const hostId = host.id

    const { result } = renderHook(() =>
      useScenario(code, hostId, { pollIntervalMs: 0 }),
    )

    await waitFor(() => {
      expect(result.current.scenario?.scenario).toBeTruthy()
    })

    const roles = result.current.scenario?.scenario?.roles ?? []
    if (roles.length < 2) {
      throw new Error('Expected multiple scenario roles')
    }
    const [firstRole, secondRole] = roles
    if (!firstRole || !secondRole) {
      throw new Error('Scenario roles were not initialised')
    }

    const idolId = game.picks[hostId]?.[0]
    if (!idolId) {
      throw new Error('Host roster is empty')
    }

    await act(async () => {
      const first = await result.current.assignRole(firstRole.id, idolId)
      expect(first.ok).toBe(true)
      if (!first.ok) {
        throw new Error(`Initial assignment failed: ${first.error.message}`)
      }
    })

    await act(async () => {
      const duplicate = await result.current.assignRole(secondRole.id, idolId)
      expect(duplicate.ok).toBe(false)
      if (duplicate.ok) {
        throw new Error('Expected duplicate assignment to fail')
      }
      expect(duplicate.error.code).toBe('idol_in_use')
    })

    await waitFor(() => {
      expect(result.current.error ?? '').toMatch(/idol/i)
    })
  })

  it('returns an error result when player context is missing', async () => {
    const { code } = await setupScenarioGame()

    const { result } = renderHook(() =>
      useScenario(code, null, { pollIntervalMs: 0 }),
    )

    const response = await result.current.assignRole('role', 'idol')
    expect(response.ok).toBe(false)
    if (response.ok) {
      throw new Error('Expected missing context to fail assignment')
    }
    expect(response.error.code).toBe('missing_context')
  })
})
