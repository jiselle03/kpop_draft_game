'use client'

import * as React from 'react'

import type { Game, IdolCard, ScenarioSnapshot } from '@/server/game/types'

type UseGameOptions = {
  pollIntervalMs?: number
}

type GameEventPayload = {
  game: Game
  scenario: ScenarioSnapshot | null
  cards: IdolCard[]
}

export function useGame(code: string | null, _options: UseGameOptions = {}) {
  const [game, setGame] = React.useState<Game | null>(null)
  const [scenario, setScenario] = React.useState<ScenarioSnapshot | null>(null)
  const [cards, setCards] = React.useState<IdolCard[]>([])
  const [error, setError] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [isConnected, setIsConnected] = React.useState(false)

  const eventSourceRef = React.useRef<EventSource | null>(null)
  const hasReceivedEventRef = React.useRef(false)
  const isMountedRef = React.useRef(true)
  const gameRef = React.useRef<Game | null>(null)

  const closeEventSource = React.useCallback(() => {
    eventSourceRef.current?.close()
    eventSourceRef.current = null
    setIsConnected(false)
  }, [])

  const refresh = React.useCallback(async () => {
    if (!code || !isMountedRef.current) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/game/${code}/state`, {
        method: 'GET',
        cache: 'no-store',
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null
        if (!isMountedRef.current) {
          return
        }
        setError(
          payload?.error?.message ??
            'We could not load the latest game state.',
        )
        if (response.status === 404 || response.status === 409) {
          setGame(null)
          gameRef.current = null
        }
        return
      }

      const payload = (await response.json()) as { data: Game }
      if (!isMountedRef.current) {
        return
      }
      setGame(payload.data)
      gameRef.current = payload.data
      setError(null)
    } catch (err) {
      if (!isMountedRef.current) {
        return
      }
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to reach the game server right now.',
      )
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [code])

  React.useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      closeEventSource()
    }
  }, [closeEventSource])

  React.useEffect(() => {
    hasReceivedEventRef.current = false
    setGame(null)
    gameRef.current = null
    setScenario(null)
    setCards([])
    setError(null)
    setIsConnected(false)
  }, [code])

  React.useEffect(() => {
    if (
      !code ||
      typeof window === 'undefined' ||
      typeof window.EventSource === 'undefined'
    ) {
      return
    }

    const source = new EventSource(`/api/game/${code}/events`)
    eventSourceRef.current = source

    const handleUpdate = (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as GameEventPayload
        if (!isMountedRef.current) {
          return
        }
        setGame(payload.game)
        gameRef.current = payload.game
        setScenario(payload.scenario)
        setCards(Array.isArray(payload.cards) ? payload.cards : [])
        setError(null)
        setIsLoading(false)
        hasReceivedEventRef.current = true
      } catch (cause) {
        console.error('Failed to parse game update payload', cause)
      }
    }

    const handleOpen = () => {
      if (!isMountedRef.current) {
        return
      }
      setIsConnected(true)
      if (!hasReceivedEventRef.current && !gameRef.current) {
        setIsLoading(true)
      }
      setError(null)
    }

    const handleError = () => {
      if (!isMountedRef.current) {
        return
      }
      setIsConnected(false)
      if (!hasReceivedEventRef.current) {
        setError('Waiting for game updates...')
      }
    }

    source.onopen = handleOpen
    source.onerror = handleError
    source.addEventListener('game:update', handleUpdate as EventListener)

    return () => {
      source.onopen = null
      source.onerror = null
      source.removeEventListener('game:update', handleUpdate as EventListener)
      source.close()
      if (eventSourceRef.current === source) {
        eventSourceRef.current = null
      }
    }
  }, [code])

  React.useEffect(() => {
    if (!code) {
      return
    }
    void refresh()
  }, [code, refresh])

  React.useEffect(() => {
    gameRef.current = game
  }, [game])

  return {
    game,
    scenario,
    cards,
    error,
    isLoading,
    isConnected,
    refresh,
  } as const
}
