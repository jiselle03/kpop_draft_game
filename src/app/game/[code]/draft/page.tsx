'use client'

import * as React from 'react'
import { Loader2, Trophy } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'

import { useGame } from '@/app/_components/hooks/use-game'
import { useGameSession } from '@/app/_components/providers/game-session-provider'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { getCardsAction, submitPickAction } from '@/server/game/actions'
import { PICKS_PER_PLAYER } from '@/server/game/types'

import type { Game, IdolCard } from '@/server/game/types'

export default function DraftPage({ params }: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = React.use(params)
  const code = rawCode.toUpperCase()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { session } = useGameSession()
  const { game, error, refresh } = useGame(code, { pollIntervalMs: 1_500 })

  const [cards, setCards] = React.useState<IdolCard[]>([])
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  React.useEffect(() => {
    void (async () => {
      const result = await getCardsAction()
      if (Array.isArray(result)) {
        setCards(result)
      }
    })()
  }, [])

  React.useEffect(() => {
    if (!game) {
      return
    }

    if (game.status === 'lobby') {
      router.replace(`/game/${code}/lobby`)
    }
  }, [game, router, code])

  const cardMap = React.useMemo(() => {
    return new Map(cards.map((card) => [card.id, card]))
  }, [cards])

  const playerId = session?.playerId
  const isMyTurn = isPlayersTurn(game, playerId)
  const totalPicks = game?.turnOrder.length ?? 0
  const completedPicks = game?.activePickIndex ?? 0
  const currentPick = Math.min(completedPicks + 1, totalPicks)
  const totalRounds = game
    ? Math.ceil(totalPicks / (game.players.length || 1))
    : 0
  const currentRound =
    game && game.players.length > 0
      ? Math.floor(completedPicks / game.players.length) + 1
      : 0

  const availableCards = React.useMemo(() => {
    if (!game) return [] as IdolCard[]
    return game.availableCardIds
      .map((id) => cardMap.get(id))
      .filter((value): value is IdolCard => Boolean(value))
  }, [game, cardMap])

  const roster = React.useMemo(
    () => buildRoster(game ?? undefined, cardMap),
    [game, cardMap],
  )
  const winnerId = React.useMemo(() => determineWinner(roster), [roster])

  const isComplete =
    game?.status === 'complete' || searchParams.get('view') === 'complete'

  const handlePick = React.useCallback(
    (cardId: string) => {
      if (!game || !playerId) {
        toast.warning('Not connected', {
          description:
            'We couldn’t verify your player session. Rejoin the lobby.',
        })
        return
      }

      if (!isPlayersTurn(game, playerId)) {
        toast.warning('Hold up', {
          description: 'It’s not your turn to pick yet.',
        })
        return
      }

      setIsSubmitting(true)
      void (async () => {
        const result = await submitPickAction(code, playerId, cardId)

        if (!result.ok) {
          toast.warning('Pick failed', {
            description: result.error.message,
          })
        } else {
          toast.success('Pick locked', {
            description: `${cardMap.get(cardId)?.name ?? 'Idol'} joined your roster!`,
          })
          void refresh()
        }

        setIsSubmitting(false)
      })()
    },
    [cardMap, code, game, playerId, refresh],
  )

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:py-12">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold sm:text-4xl">Draft Board</h1>
          {game ? (
            <p className="text-muted text-sm">
              {isComplete
                ? 'Draft complete — review rosters below.'
                : `Round ${currentRound} of ${totalRounds} · Pick ${currentPick} of ${totalPicks}`}
            </p>
          ) : (
            <p className="text-muted text-sm">Loading lobby data…</p>
          )}
        </div>
        <Badge
          variant="secondary"
          className="px-4 py-2 text-base font-semibold tracking-[0.2em]"
        >
          {code}
        </Badge>
      </header>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">
                  {isComplete
                    ? 'All picks are in'
                    : isMyTurn
                      ? 'Your turn!'
                      : game?.status === 'drafting'
                        ? `${getPlayerName(game, game.turnOrder[game.activePickIndex])} is drafting`
                        : 'Waiting for draft'}
                </CardTitle>
                <CardDescription>
                  {isComplete
                    ? 'Take a victory lap and review everyone’s lineup.'
                    : 'Select an idol card to add it to the active roster.'}
                </CardDescription>
              </div>
              {game && !isComplete ? (
                <Badge variant="outline">
                  Pick {currentPick}/{totalPicks}
                </Badge>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            {game?.availableCardIds.length === 0 ? (
              <Alert variant="destructive">
                <AlertDescription>
                  No idol cards left in the pool. The draft is wrapping up!
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {availableCards.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => handlePick(card.id)}
                    disabled={!isMyTurn || isComplete || isSubmitting}
                    className="group border-border bg-surface relative overflow-hidden rounded-lg border p-4 text-left transition-shadow hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <div className="space-y-2">
                      <p className="text-foreground text-lg font-semibold">
                        {card.name}
                      </p>
                      <p className="text-muted text-sm">{card.group}</p>
                    </div>
                    <span className="border-primary pointer-events-none absolute inset-0 rounded-lg border-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
                  </button>
                ))}
                {availableCards.length === 0 && (
                  <div className="border-border/60 bg-surface-muted/30 text-muted col-span-full flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center text-sm">
                    <Loader2
                      className="text-muted mb-3 h-6 w-6 animate-spin"
                      aria-hidden
                    />
                    Syncing idol deck…
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Draft order</CardTitle>
              <CardDescription>
                Snake order repeats every round. Stay sharp when it swings back!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2 text-sm">
                {game?.turnOrder.map((id, index) => {
                  const pickNumber = index + 1
                  const roundNumber = game.players.length
                    ? Math.floor(index / game.players.length) + 1
                    : 0
                  const participant = getPlayerName(game, id)
                  const isCurrentPick = index === game.activePickIndex
                  return (
                    <li
                      key={`${id}-${index}`}
                      className={`flex items-center justify-between rounded-md border px-3 py-2 ${isCurrentPick ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-surface'}`}
                    >
                      <span>
                        <strong className="mr-2 text-xs tracking-wide uppercase">
                          {pickNumber}
                        </strong>
                        {participant}
                      </span>
                      <span className="text-muted text-xs">
                        Round {roundNumber}
                      </span>
                    </li>
                  )
                })}
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Rosters</CardTitle>
              <CardDescription>
                {isComplete
                  ? 'Draft results locked — compare lineups!'
                  : 'Picks update in real time as each idol is drafted.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {game ? (
                <Tabs defaultValue={game.players[0]?.id} className="w-full">
                  <TabsList className="w-full justify-start overflow-x-auto">
                    {game.players.map((participant) => (
                      <TabsTrigger key={participant.id} value={participant.id}>
                        {participant.name}
                        {participant.id === playerId ? ' • You' : ''}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {game.players.map((participant) => (
                    <TabsContent
                      key={participant.id}
                      value={participant.id}
                      className="space-y-3 bg-transparent"
                    >
                      <RosterList
                        picks={roster.get(participant.id) ?? []}
                        isWinner={isComplete && participant.id === winnerId}
                      />
                    </TabsContent>
                  ))}
                </Tabs>
              ) : (
                <Loader2
                  className="text-muted h-5 w-5 animate-spin"
                  aria-hidden
                />
              )}
            </CardContent>
          </Card>
        </aside>
      </section>
    </div>
  )
}

function buildRoster(
  game: Game | undefined | null,
  cardMap: Map<string, IdolCard>,
) {
  const roster = new Map<string, { card: IdolCard; pickNumber: number }[]>()
  if (!game) return roster

  Object.entries(game.picks).forEach(([playerId, picks]) => {
    const enriched = picks.map((cardId, index) => ({
      card: cardMap.get(cardId) ?? {
        id: cardId,
        name: 'Unknown Idol',
        group: '',
      },
      pickNumber: index + 1,
    }))
    roster.set(playerId, enriched)
  })

  return roster
}

function isPlayersTurn(
  game: Game | undefined | null,
  playerId: string | undefined,
) {
  if (!game || !playerId) return false
  if (game.status !== 'drafting') return false
  return game.turnOrder[game.activePickIndex] === playerId
}

function getPlayerName(game: Game, playerId: string | undefined) {
  if (!playerId) return 'Unknown'
  return game.players.find((entry) => entry.id === playerId)?.name ?? 'Unknown'
}

function determineWinner(
  roster: Map<string, { card: IdolCard; pickNumber: number }[]>,
) {
  let maxCount = -1
  let winner: string | null = null
  roster.forEach((picks, playerId) => {
    if (picks.length > maxCount) {
      maxCount = picks.length
      winner = playerId
    }
  })
  return winner
}

function RosterList({
  picks,
  isWinner,
}: {
  picks: { card: IdolCard; pickNumber: number }[]
  isWinner: boolean
}) {
  if (picks.length === 0) {
    return (
      <div className="border-border/60 bg-surface-muted/40 text-muted rounded-lg border border-dashed p-4 text-sm">
        No picks yet — you’re on deck.
      </div>
    )
  }

  return (
    <Accordion type="single" collapsible defaultValue="open">
      <AccordionItem value="open" className="border-border">
        <AccordionTrigger className="text-left text-sm font-medium">
          {isWinner ? (
            <span className="text-primary inline-flex items-center gap-1">
              <Trophy className="h-4 w-4" aria-hidden /> Champion lineup
            </span>
          ) : (
            <span>
              Drafted idols ({picks.length}/{PICKS_PER_PLAYER})
            </span>
          )}
        </AccordionTrigger>
        <AccordionContent className="space-y-3">
          {picks.map(({ card, pickNumber }) => (
            <div
              key={`${card.id}-${pickNumber}`}
              className="border-border bg-surface rounded-lg border px-3 py-2"
            >
              <p className="text-foreground text-sm font-semibold">
                Pick {pickNumber}: {card.name}
              </p>
              <p className="text-muted text-xs">{card.group}</p>
            </div>
          ))}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
