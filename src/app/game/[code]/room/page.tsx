'use client'

import * as React from 'react'
import {
  CheckCircle,
  Loader2,
  PartyPopper,
  Send,
  Sparkles,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'

import { useScenario } from '@/app/_components/hooks/use-scenario'
import { useGame } from '@/app/_components/hooks/use-game'
import { useGameSession } from '@/app/_components/providers/game-session-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type {
  Game,
  IdolCard,
  ScenarioRole,
  ScenarioSnapshot,
} from '@/server/game/types'

export default function GameRoomPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code: rawCode } = React.use(params)
  const code = rawCode.toUpperCase()
  const { session } = useGameSession()
  const playerId = session?.playerId ?? null

  const {
    game,
    cards,
    scenario: liveScenario,
    error: gameError,
    refresh: refreshGame,
  } = useGame(code)
  const {
    scenario,
    error: scenarioError,
    isLoading: isScenarioLoading,
    isAssigning,
    isSubmitting,
    assignRole,
    submitSelections,
    refresh: refreshScenario,
  } = useScenario(code, playerId, { scenario: liveScenario })

  const [activeRoleId, setActiveRoleId] = React.useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const errorMessage = gameError ?? scenarioError

  React.useEffect(() => {
    // Close selection dialog if the scenario has moved into reveal
    if (scenario?.status === 'reveal') {
      setIsDialogOpen(false)
      setActiveRoleId(null)
    }
  }, [scenario?.status])

  React.useEffect(() => {
    if (scenario?.status === 'reveal') {
      void refreshGame()
    }
  }, [scenario?.status, refreshGame])

  const cardMap = React.useMemo(() => {
    return new Map(cards.map((card) => [card.id, card]))
  }, [cards])

  const rosterByPlayer = React.useMemo(() => {
    return buildRoster(game, cardMap)
  }, [game, cardMap])

  const myRoster = playerId ? rosterByPlayer.get(playerId) ?? [] : []

  const activeScenario = scenario?.scenario ?? null
  const totalScenarios = scenario?.totalScenarios ?? 0
  const currentScenarioIndex = scenario?.currentScenarioIndex ?? 0
  const roleAssignments = React.useMemo<ScenarioSnapshot['roleAssignments']>(() => {
    return scenario?.roleAssignments ?? {}
  }, [scenario])
  const submissionState = React.useMemo<ScenarioSnapshot['submissionState']>(() => {
    return scenario?.submissionState ?? {}
  }, [scenario])
  const scenarioStatus = scenario?.status ?? 'scenario'
  const isSubmitted = playerId
    ? submissionState[playerId] === 'submitted'
    : false

  const playersPending =
    scenario && game
      ? game.players
          .filter((player) => submissionState[player.id] === 'pending')
          .map((player) => player.id)
      : []
  const pendingCount = playersPending.length
  const allPlayersCount = game?.players.length ?? 0

  const canSubmit =
    Boolean(activeScenario) &&
    Boolean(playerId) &&
    activeScenario!.roles.every((role) =>
      Boolean(roleAssignments[role.id]?.[playerId!]),
    )

  const statusMessage = React.useMemo(() => {
    if (!scenario || !activeScenario) {
      return 'Scenario loading — hang tight.'
    }
    if (scenarioStatus === 'reveal') {
      return 'All selections are locked in. Enjoy the big reveal!'
    }
    if (isSubmitted) {
      if (pendingCount === 0) {
        return 'Everyone is in! Reveal will trigger shortly.'
      }
      if (pendingCount === 1) {
        return 'Submitted. Waiting on 1 more player.'
      }
      return `Submitted. Waiting on ${pendingCount} players.`
    }
    return 'Assign an idol to each role, then submit when you are ready.'
  }, [scenario, activeScenario, scenarioStatus, isSubmitted, pendingCount])

  const activeRole = React.useMemo(() => {
    if (!activeScenario || !activeRoleId) return null
    return (
      activeScenario.roles.find((role) => role.id === activeRoleId) ?? null
    )
  }, [activeScenario, activeRoleId])

  const currentSelectionId =
    activeRole && playerId
      ? roleAssignments[activeRole.id]?.[playerId] ?? null
      : null

  const handleOpenRole = React.useCallback(
    (roleId: string) => {
      if (scenarioStatus === 'reveal' || isSubmitted) {
        return
      }
      setActiveRoleId(roleId)
      setIsDialogOpen(true)
    },
    [scenarioStatus, isSubmitted],
  )

  const handleAssignIdol = React.useCallback(
    async (idolId: string) => {
      if (!activeRole || !playerId || !activeScenario) {
        return
      }

      const card = cardMap.get(idolId)
      const result = await assignRole(activeRole.id, idolId)

      if (result.ok) {
        toast.success('Role assigned', {
          description: `${card?.name ?? 'Idol'} will handle the ${activeRole.label.toLowerCase()} role.`,
        })
        setIsDialogOpen(false)
      } else {
        toast.warning('Assignment failed', {
          description: result.error.message,
        })
        void refreshScenario()
      }
    },
    [
      activeRole,
      assignRole,
      playerId,
      cardMap,
      refreshScenario,
      activeScenario,
    ],
  )

  const handleSubmit = React.useCallback(async () => {
    const result = await submitSelections()

    if (result.ok) {
      toast.success('Selections submitted', {
        description:
          'We locked your picks. Waiting on the rest of the room now.',
      })
    } else {
      toast.warning('Submission failed', {
        description: result.error.message,
      })
      void refreshScenario()
    }
  }, [submitSelections, refreshScenario])

  const revealGrid = React.useMemo(() => {
    if (!activeScenario || !game) {
      return []
    }

    return activeScenario.roles.map((role) => {
      return {
        role,
        picks: game.players.map((player) => {
          const idolId = roleAssignments[role.id]?.[player.id] ?? null
          const card = idolId ? cardMap.get(idolId) ?? null : null
          return {
            player,
            card,
          }
        }),
      }
    })
  }, [activeScenario, game, roleAssignments, cardMap])

  const dialogDisabledReason = React.useMemo(() => {
    if (!playerId) {
      return 'You must join the lobby to make selections.'
    }
    if (scenarioStatus === 'reveal') {
      return 'Selections are locked during the reveal.'
    }
    if (isSubmitted) {
      return 'Selections already submitted.'
    }
    return null
  }, [playerId, scenarioStatus, isSubmitted])

  const isSelectionDisabled = !!dialogDisabledReason

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:py-12">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold sm:text-4xl">
            Scenario Room
          </h1>
          <p className="text-muted text-sm">{statusMessage}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {totalScenarios > 0 ? (
            <Badge variant="outline" className="flex items-center gap-1 px-3 py-1">
              <Sparkles className="h-4 w-4" aria-hidden />
              Scenario {currentScenarioIndex + 1}/{totalScenarios}
            </Badge>
          ) : null}
          <Badge
            variant="secondary"
            className="px-4 py-2 text-base font-semibold tracking-[0.2em]"
          >
            {code}
          </Badge>
        </div>
      </header>

      <div className="sr-only" aria-live="polite">
        {statusMessage}
      </div>

      {errorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {!playerId && (
        <Alert variant="destructive">
          <AlertDescription>
            We could not match your player session. Rejoin from the lobby to
            participate in the scenario.
          </AlertDescription>
        </Alert>
      )}

      <section className="grid gap-6 lg:grid-cols-[3fr,2fr]">
        <Card
          className="motion-safe:animate-in motion-safe:fade-in-50 motion-safe:slide-in-from-bottom-2 motion-reduce:animate-none"
          aria-busy={isScenarioLoading}
        >
          <CardHeader className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-2xl font-semibold">
                  {activeScenario?.title ?? 'Loading scenario'}
                </CardTitle>
                <CardDescription>
                  {activeScenario?.prompt ?? 'Syncing the next scenario card...'}
                </CardDescription>
              </div>
              {scenarioStatus === 'reveal' ? (
                <Badge variant="default" className="flex items-center gap-1">
                  <PartyPopper className="h-4 w-4" aria-hidden />
                  Reveal live
                </Badge>
              ) : isSubmitted ? (
                <Badge variant="outline" className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-emerald-500" aria-hidden />
                  Submitted
                </Badge>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {isScenarioLoading && !activeScenario ? (
              <div className="border-border/60 bg-surface-muted/40 text-muted flex items-center gap-3 rounded-lg border border-dashed p-5 text-sm">
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                Preparing the next scenario card…
              </div>
            ) : null}

            {activeScenario ? (
              <>
                {scenarioStatus === 'reveal' ? (
                  <div className="grid gap-4">
                    {revealGrid.map(({ role, picks }) => (
                      <div
                        key={role.id}
                        className="border-border bg-surface rounded-lg border p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-foreground text-lg font-semibold">
                              {role.label}
                            </h3>
                            {role.description ? (
                              <p className="text-muted text-sm">
                                {role.description}
                              </p>
                            ) : null}
                          </div>
                        </div>
                        <ul className="mt-4 space-y-2 text-sm">
                          {picks.map(({ player, card }) => (
                            <li
                              key={`${role.id}-${player.id}`}
                              className="border-border/60 bg-surface-muted/40 flex items-center justify-between rounded-md border p-3"
                            >
                              <span className="font-medium">
                                {player.name}
                                {player.id === playerId ? ' • You' : ''}
                              </span>
                              <span className="text-muted">
                                {card ? card.name : '—'}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {activeScenario.roles.map((role) => {
                        const assignedId =
                          playerId && roleAssignments[role.id]
                            ? roleAssignments[role.id]![playerId] ?? null
                            : null
                        const assignedCard = assignedId
                          ? cardMap.get(assignedId) ?? null
                          : null
                        const assignedName = assignedCard?.name ?? null
                        const assignedGroup = assignedCard?.group ?? null
                        const description = role.description ?? ''

                        return (
                          <button
                            key={role.id}
                            type="button"
                            onClick={() => handleOpenRole(role.id)}
                            disabled={isSelectionDisabled || isAssigning}
                            data-testid="scenario-role"
                            data-role-id={role.id}
                            className="border-border bg-surface relative flex h-full flex-col justify-between rounded-lg border p-4 text-left transition hover:shadow-lg focus-visible:ring focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-75"
                          >
                            <div className="space-y-2">
                              <p className="text-foreground text-lg font-semibold">
                                {role.label}
                              </p>
                              {description ? (
                                <p className="text-muted text-sm">{description}</p>
                              ) : null}
                            </div>
                            <div className="mt-4">
                              {assignedName ? (
                                <div className="border-primary/40 bg-primary/10 flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm font-medium">
                                  <div>
                                    <p className="text-foreground">{assignedName}</p>
                                    {assignedGroup ? (
                                      <p className="text-muted text-xs uppercase tracking-wide">
                                        {assignedGroup}
                                      </p>
                                    ) : null}
                                  </div>
                                  <Badge variant="secondary" className="shrink-0">
                                    Assigned
                                  </Badge>
                                </div>
                              ) : (
                                <div className="border-border/60 text-muted flex items-center justify-between rounded-md border border-dashed px-3 py-2 text-sm">
                                  <span>Select an idol</span>
                                  <Sparkles className="h-4 w-4" aria-hidden />
                                </div>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-muted text-sm">
                        {isSubmitted
                          ? pendingCount === 0
                            ? 'Waiting for reveal…'
                            : `Waiting for ${pendingCount} ${pendingCount === 1 ? 'player' : 'players'}`
                          : dialogDisabledReason ?? 'Roles are editable until you submit.'}
                      </div>
                      <Button
                        size="lg"
                        className="w-full sm:w-auto"
                        onClick={handleSubmit}
                        disabled={
                          !canSubmit ||
                          isSubmitted ||
                          scenarioStatus !== 'scenario' ||
                          isSubmitting
                        }
                      >
                        {isSubmitting ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                        ) : (
                          <Send className="mr-2 h-4 w-4" aria-hidden />
                        )}
                        Submit selections
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </CardContent>
        </Card>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-24">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your roster</CardTitle>
              <CardDescription>
                Tap a role, then choose one of your drafted idols.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {myRoster.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {myRoster.map((entry, index) => (
                    <div
                      key={`${entry.card.id}-${index}`}
                      className="border-border bg-surface rounded-md border px-3 py-2"
                    >
                      <p className="text-foreground text-sm font-semibold">
                        {entry.card.name}
                      </p>
                      <p className="text-muted text-xs uppercase tracking-wide">
                        {entry.card.group}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border-border/60 bg-surface-muted/40 text-muted rounded-md border border-dashed px-3 py-4 text-sm">
                  Draft results syncing…
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Room status</CardTitle>
              <CardDescription>
                {pendingCount === 0
                  ? 'All players have submitted.'
                  : `${pendingCount}/${allPlayersCount} ${pendingCount === 1 ? 'player' : 'players'} pending`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {game ? (
                <ul className="space-y-2 text-sm">
                  {game.players.map((player) => {
                    const submission = submissionState[player.id] ?? 'pending'
                    const isSelf = player.id === playerId
                    return (
                      <li
                        key={player.id}
                        className="border-border bg-surface flex items-center justify-between rounded-md border px-3 py-2"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {player.name}
                            {isSelf ? ' • You' : ''}
                          </span>
                          <span className="text-muted text-xs">
                            Seat {player.seat ?? '—'}
                          </span>
                        </div>
                        <Badge
                          variant={submission === 'submitted' ? 'default' : 'outline'}
                          className="flex items-center gap-1"
                        >
                          {submission === 'submitted' ? (
                            <CheckCircle className="h-3.5 w-3.5" aria-hidden />
                          ) : (
                            <Users className="h-3.5 w-3.5" aria-hidden />
                          )}
                          {submission === 'submitted' ? 'Submitted' : 'Pending'}
                        </Badge>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <div className="border-border/60 bg-surface-muted/40 text-muted flex items-center gap-2 rounded-md border border-dashed p-3 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Syncing lobby roster…
                </div>
              )}
            </CardContent>
          </Card>
        </aside>
      </section>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) {
            setActiveRoleId(null)
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              Choose an idol for {activeRole?.label ?? 'this role'}
            </DialogTitle>
            <DialogDescription>
              {activeRole?.description ??
                'Pick one idol from your roster to lock in this role.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {activeRole ? (
              myRoster.length > 0 ? (
                myRoster.map((entry) => {
                  const disabled = shouldDisableIdolSelection(
                    entry.card.id,
                    activeRole,
                    roleAssignments,
                    playerId,
                    activeScenario,
                  )
                  const isActive = currentSelectionId === entry.card.id

                  return (
                    <button
                      key={entry.card.id}
                      type="button"
                      onClick={() => void handleAssignIdol(entry.card.id)}
                      disabled={disabled || isAssigning}
                      data-testid="scenario-roster-card"
                      data-card-id={entry.card.id}
                      className={`border-border flex w-full flex-col items-start rounded-md border px-4 py-3 text-left transition hover:shadow focus-visible:ring ${disabled ? 'cursor-not-allowed opacity-60' : ''} ${isActive ? 'border-primary bg-primary/10' : 'bg-surface'}`}
                    >
                      <span className="text-foreground font-semibold">
                        {entry.card.name}
                      </span>
                      <span className="text-muted text-xs uppercase tracking-wide">
                        {entry.card.group}
                      </span>
                    </button>
                  )
                })
              ) : (
                <div className="border-border/60 bg-surface-muted/60 text-muted rounded-md border border-dashed px-4 py-6 text-sm">
                  Your roster is still syncing. Try again in a moment.
                </div>
              )
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function buildRoster(game: Game | null, cardMap: Map<string, IdolCard>) {
  const roster = new Map<
    string,
    { card: IdolCard; pickNumber: number }[]
  >()
  if (!game) return roster

  Object.entries(game.picks).forEach(([playerId, picks]) => {
    const enriched = picks.map((cardId, index) => ({
      card:
        cardMap.get(cardId) ?? {
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

function shouldDisableIdolSelection(
  idolId: string,
  role: ScenarioRole,
  assignments: ScenarioSnapshot['roleAssignments'],
  playerId: string | null,
  scenario: ScenarioSnapshot['scenario'],
) {
  if (!playerId || !scenario) {
    return true
  }

  if (role.allowDuplicateIdols) {
    return false
  }

  return scenario.roles.some((entry) => {
    if (entry.id === role.id) {
      return false
    }

    if (entry.allowDuplicateIdols) {
      return false
    }

    return assignments[entry.id]?.[playerId] === idolId
  })
}
