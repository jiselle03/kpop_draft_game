'use client'

import * as React from 'react'
import { Copy, Crown, Lock, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { useGameSession } from '@/app/_components/providers/game-session-provider'
import { useGame } from '@/app/_components/hooks/use-game'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { startDraftAction } from '@/server/game/actions'
import { MAX_PLAYERS } from '@/server/game/types'

import type { Player } from '@/server/game/types'

export default function LobbyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = React.use(params)
  const code = rawCode.toUpperCase()
  const router = useRouter()
  const { session } = useGameSession()
  const { game, error, refresh } = useGame(code)

  const playerId = session?.playerId
  const player = game?.players.find((entry) => entry.id === playerId)
  const isCreator = game && player ? game.creatorId === player.id : false
  const slotsRemaining = game ? MAX_PLAYERS - game.players.length : MAX_PLAYERS

  React.useEffect(() => {
    if (!game) {
      return
    }

    if (game.status === 'drafting') {
      router.replace(`/game/${code}/draft`)
      return
    }

    if (game.status === 'scenario' || game.status === 'reveal') {
      router.replace(`/game/${code}/room`)
      return
    }

    if (game.status === 'complete') {
      router.replace(`/game/${code}/room?view=complete`)
    }
  }, [game, router, code])

  React.useEffect(() => {
    if (session && session.code !== code) {
      toast.warning('Wrong lobby', {
        description:
          'You’re signed into a different lobby. Join again to sync.',
      })
    }
  }, [session, code])

  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code)
      toast.success('Code copied', {
        description: 'Share it with your friends to bring them into the lobby.',
      })
    } catch {
      toast.warning('Unable to copy', {
        description: 'Copy the code manually: ' + code,
      })
    }
  }, [code])

  const handleStartDraft = React.useCallback(() => {
    if (!game || !player) {
      return
    }

    void (async () => {
      const result = await startDraftAction(code, player.id)
      if (!result.ok) {
        toast.warning('Cannot start yet', {
          description: result.error.message,
        })
        void refresh()
        return
      }

      router.replace(`/game/${code}/draft`)
    })()
  }, [code, game, player, refresh, router])

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:py-16">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold sm:text-4xl">Lobby</h1>
          <p className="text-muted text-sm">
            Share the code below. The draft begins once everyone is in.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant="secondary"
            className="px-4 py-2 text-base font-semibold tracking-[0.2em]"
            data-testid="lobby-code"
          >
            {code}
          </Badge>
          <Button variant="outline" onClick={handleCopy}>
            <Copy className="mr-2 h-4 w-4" aria-hidden />
            Copy
          </Button>
        </div>
      </header>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!session && (
        <Alert variant="destructive">
          <AlertDescription>
            We couldn’t match you to this lobby. Rejoin from the home screen to
            continue.
          </AlertDescription>
        </Alert>
      )}

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">Players</CardTitle>
              <CardDescription>
                {game
                  ? `${game.players.length} joined · ${slotsRemaining} ${slotsRemaining === 1 ? 'slot' : 'slots'} open`
                  : 'Waiting for lobby data...'}
              </CardDescription>
            </div>
            <Badge variant={slotsRemaining === 0 ? 'destructive' : 'outline'}>
              <Users className="mr-1.5 h-4 w-4" aria-hidden />
              {game
                ? `${game.players.length}/${MAX_PLAYERS}`
                : `0/${MAX_PLAYERS}`}
            </Badge>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {game?.players.map((entry) => (
                <LobbyPlayer
                  key={entry.id}
                  player={entry}
                  isCurrent={entry.id === playerId}
                  isCreator={entry.id === game.creatorId}
                />
              ))}
              {game && game.players.length < MAX_PLAYERS
                ? Array.from({ length: MAX_PLAYERS - game.players.length }).map(
                    (_, index) => (
                      <li
                        key={`open-slot-${index}`}
                        className="border-border/60 bg-surface-muted/60 text-sm text-muted-foreground rounded-lg border border-dashed px-4 py-3"
                      >
                        Waiting for player {game.players.length + index + 1}
                      </li>
                    ),
                  )
                : null}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Ready to draft?</CardTitle>
            <CardDescription>
              The host can start once at least two players are present.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              className="w-full"
              size="lg"
              disabled={!game || !isCreator || game.players.length < 2}
              onClick={handleStartDraft}
              data-testid="start-draft"
            >
              <Lock className="mr-2 h-4 w-4" aria-hidden />
              Start Draft
            </Button>
            <Alert>
              <AlertDescription>
                {isCreator
                  ? 'Starting locks new entries and shuffles everyone for the first pick.'
                  : 'Waiting on the host to start the draft.'}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function LobbyPlayer({
  player,
  isCurrent,
  isCreator,
}: {
  player: Player
  isCurrent: boolean
  isCreator: boolean
}) {
  return (
    <li
      className="border-border bg-surface flex items-center justify-between rounded-lg border px-4 py-3"
      data-testid="lobby-player"
      data-player-id={player.id}
    >
      <div>
        <p className="text-foreground text-sm font-semibold">{player.name}</p>
        <p className="text-muted text-xs">
          {isCreator ? 'Host' : 'Player'}
          {isCurrent ? ' · You' : null}
        </p>
      </div>
      {isCreator ? (
        <Crown className="text-primary h-4 w-4" aria-hidden />
      ) : null}
    </li>
  )
}
