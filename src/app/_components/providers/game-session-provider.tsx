'use client'

import * as React from 'react'

type GameSession = {
  code: string
  playerId: string
  displayName: string
}

type GameSessionContextValue = {
  session: GameSession | null
  setSession: (session: GameSession) => void
  clearSession: () => void
}

const STORAGE_KEY = 'kpop-draft-session'

const GameSessionContext = React.createContext<GameSessionContextValue | null>(
  null,
)

export function GameSessionProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [session, setSessionState] = React.useState<GameSession | null>(null)

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as GameSession
        setSessionState(parsed)
      }
    } catch (error) {
      console.warn('Unable to restore game session', error)
    }
  }, [])

  const setSession = React.useCallback((value: GameSession) => {
    setSessionState(value)
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    }
  }, [])

  const clearSession = React.useCallback(() => {
    setSessionState(null)
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  const value = React.useMemo(
    () => ({ session, setSession, clearSession }),
    [session, setSession, clearSession],
  )

  return (
    <GameSessionContext.Provider value={value}>
      {children}
    </GameSessionContext.Provider>
  )
}

export function useGameSession() {
  const context = React.useContext(GameSessionContext)
  if (!context) {
    throw new Error('useGameSession must be used within a GameSessionProvider')
  }
  return context
}
