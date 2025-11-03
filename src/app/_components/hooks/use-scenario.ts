'use client'

import * as React from 'react'

import {
  assignScenarioRoleAction,
  submitScenarioSelectionsAction,
} from '@/server/game/actions'
import type { GameResult, ScenarioSnapshot } from '@/server/game/types'

type UseScenarioOptions = {
  pollIntervalMs?: number
  scenario?: ScenarioSnapshot | null
}

export function useScenario(
  code: string | null,
  playerId: string | null,
  options: UseScenarioOptions = {},
) {
  const externalScenario = options.scenario

  const [scenario, setScenario] = React.useState<ScenarioSnapshot | null>(
    externalScenario ?? null,
  )
  const stateRef = React.useRef<ScenarioSnapshot | null>(externalScenario ?? null)
  const [error, setError] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [isAssigning, setIsAssigning] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const fetchScenario = React.useCallback(async () => {
    if (!code) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/game/${code}/scenario`, {
        method: 'GET',
        cache: 'no-store',
      })
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null
        setError(
          payload?.error?.message ??
            'We could not sync the latest scenario state.',
        )
        return
      }

      const payload = (await response.json()) as {
        data: ScenarioSnapshot
      }
      stateRef.current = payload.data
      setScenario(payload.data)
      setError(null)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to reach the game server right now.',
      )
    } finally {
      setIsLoading(false)
    }
  }, [code])

  React.useEffect(() => {
    stateRef.current = externalScenario ?? null
    setScenario(externalScenario ?? null)
    if (externalScenario) {
      setError(null)
      setIsLoading(false)
    }
  }, [externalScenario])

  React.useEffect(() => {
    if (externalScenario !== undefined) {
      return
    }

    stateRef.current = null
    setScenario(null)
    setError(null)

    if (!code) {
      return
    }

    void fetchScenario()
  }, [code, externalScenario, fetchScenario])

  const optimisticUpdate = React.useCallback(
    (updater: (previous: ScenarioSnapshot) => ScenarioSnapshot) => {
      setScenario((previous) => {
        if (!previous) {
          return previous
        }
        const next = updater(previous)
        stateRef.current = next
        return next
      })
    },
    [],
  )

  const assignRole = React.useCallback(
    async (
      roleId: string,
      idolId: string,
    ): Promise<GameResult<ScenarioSnapshot>> => {
      if (!code || !playerId) {
        return {
          ok: false,
          error: {
            code: 'missing_context',
            message: 'Missing game or player context for assignment.',
          },
        } satisfies GameResult<ScenarioSnapshot>
      }

      setIsAssigning(true)

      if (stateRef.current) {
        optimisticUpdate((previous) => {
          const assignment = {
            ...(previous.roleAssignments[roleId] ?? {}),
            [playerId]: idolId,
          }
          const roleAssignments = {
            ...previous.roleAssignments,
            [roleId]: assignment,
          }
          const submissionState = {
            ...previous.submissionState,
          }
          if (submissionState[playerId] === 'submitted') {
            submissionState[playerId] = 'pending'
          }
          return {
            ...previous,
            roleAssignments,
            submissionState,
            updatedAt: Date.now(),
          }
        })
      }

      const result = await assignScenarioRoleAction(
        code,
        playerId,
        roleId,
        idolId,
      )

      if (result.ok) {
        stateRef.current = result.data
        setScenario(result.data)
        setError(null)
      } else {
        setError(result.error.message)
        await fetchScenario()
      }

      setIsAssigning(false)
      return result
    },
    [code, playerId, optimisticUpdate, fetchScenario],
  )

  const submitSelections = React.useCallback(async (): Promise<
    GameResult<ScenarioSnapshot>
  > => {
    if (!code || !playerId) {
      return {
        ok: false,
        error: {
          code: 'missing_context',
          message: 'Missing game or player context for submission.',
        },
      } satisfies GameResult<ScenarioSnapshot>
    }

    setIsSubmitting(true)
    const result = await submitScenarioSelectionsAction(code, playerId)

    if (result.ok) {
      stateRef.current = result.data
      setScenario(result.data)
      setError(null)
    } else {
      setError(result.error.message)
      await fetchScenario()
    }

    setIsSubmitting(false)
    return result
  }, [code, playerId, fetchScenario])

  return {
    scenario,
    error,
    isLoading,
    isAssigning,
    isSubmitting,
    assignRole,
    submitSelections,
    refresh: fetchScenario,
  } as const
}
