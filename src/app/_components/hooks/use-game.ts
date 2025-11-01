'use client'

import * as React from 'react'

import { getGameAction } from '@/server/game/actions'
import type { Game } from '@/server/game/types'

type UseGameOptions = {
  pollIntervalMs?: number
}

export function useGame(code: string | null, options: UseGameOptions = {}) {
  const { pollIntervalMs = 2_000 } = options
  const [game, setGame] = React.useState<Game | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)

  const fetchGame = React.useCallback(async () => {
    if (!code) {
      return
    }

    setIsLoading(true)
    const result = await getGameAction(code)

    if (result.ok) {
      setGame(result.data)
      setError(null)
    } else {
      setError(result.error.message)
    }
    setIsLoading(false)
  }, [code])

  React.useEffect(() => {
    if (!code) {
      return
    }

    let mounted = true
    const run = async () => {
      if (!mounted) return
      await fetchGame()
    }
    void run()

    if (!pollIntervalMs || typeof window === 'undefined') {
      return () => {
        mounted = false
      }
    }

    const interval = window.setInterval(() => {
      void fetchGame()
    }, pollIntervalMs)

    return () => {
      mounted = false
      window.clearInterval(interval)
    }
  }, [code, pollIntervalMs, fetchGame])

  return {
    game,
    error,
    isLoading,
    refresh: fetchGame,
  } as const
}
