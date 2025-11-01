'use client'

import * as React from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { useGameSession } from '@/app/_components/providers/game-session-provider'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { createGameAction, joinGameAction } from '@/server/game/actions'

const formSchema = z.object({
  displayName: z
    .string({ required_error: 'Please enter a display name.' })
    .trim()
    .min(2, 'Use at least 2 characters.')
    .max(20, 'Keep it under 20 characters.'),
  code: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

export default function Home() {
  const router = useRouter()
  const { setSession, session } = useGameSession()
  const [isJoinExpanded, setJoinExpanded] = React.useState(false)
  const [isPending, startTransition] = React.useTransition()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      displayName: session?.displayName ?? '',
      code: '',
    },
  })

  const handleCreate = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await createGameAction(values.displayName)

      if (!result.ok) {
        toast.error('Could not create lobby', {
          description: result.error.message,
        })
        return
      }

      const { game, player } = result.data
      setSession({
        code: game.code,
        playerId: player.id,
        displayName: player.name,
      })
      router.push(`/game/${game.code}/lobby`)
    })
  })

  const handleJoin = form.handleSubmit((values) => {
    const code = (values.code ?? '').trim().toUpperCase()

    if (code.length === 0) {
      form.setError('code', {
        type: 'manual',
        message: 'Enter the 6-character code you received.',
      })
      setJoinExpanded(true)
      return
    }

    if (!/^[A-Z0-9]{6}$/.test(code)) {
      form.setError('code', {
        type: 'manual',
        message: 'Codes use six letters or numbers.',
      })
      setJoinExpanded(true)
      return
    }

    startTransition(async () => {
      const result = await joinGameAction(code, values.displayName)

      if (!result.ok) {
        toast.warning('Unable to join', {
          description: result.error.message,
        })
        return
      }

      const { game, player } = result.data
      setSession({
        code: game.code,
        playerId: player.id,
        displayName: player.name,
      })
      router.push(`/game/${game.code}/lobby`)
    })
  })

  const onJoinClick = React.useCallback(() => {
    if (!isJoinExpanded) {
      setJoinExpanded(true)
      return
    }

    void handleJoin()
  }, [handleJoin, isJoinExpanded])

  return (
    <div className="from-primary/10 via-surface to-background relative isolate overflow-hidden bg-gradient-to-br">
      <div className="absolute inset-0 -z-10 opacity-80" aria-hidden>
        <div className="bg-primary/20 absolute top-12 left-1/4 h-48 w-48 rounded-full blur-3xl" />
        <div className="bg-secondary/25 absolute top-1/3 right-[15%] h-64 w-64 rounded-full blur-3xl" />
      </div>
      <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-4 py-12 sm:px-8">
        <Card className="bg-surface/90 w-full max-w-xl shadow-xl backdrop-blur">
          <CardHeader className="space-y-3 text-center">
            <CardTitle className="text-3xl font-semibold sm:text-4xl">
              K-Pop Draft Night
            </CardTitle>
            <CardDescription className="text-muted-foreground text-base">
              Assemble up to six friends, draft eight idols each, and flex your
              ultimate bias lineup.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Form {...form}>
              <form
                className="space-y-5"
                onSubmit={(event) => event.preventDefault()}
              >
                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g. BiasBreaker"
                          autoComplete="name"
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {isJoinExpanded && (
                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Game code</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="ABC123"
                            inputMode="text"
                            autoCapitalize="characters"
                            autoComplete="off"
                            maxLength={6}
                            disabled={isPending}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  <Button
                    type="button"
                    size="lg"
                    onClick={() => void handleCreate()}
                    disabled={isPending}
                    className="w-full"
                  >
                    {isPending ? (
                      <Loader2
                        className="mr-2 h-4 w-4 animate-spin"
                        aria-hidden
                      />
                    ) : null}
                    Create Game
                  </Button>
                  <Button
                    type="button"
                    size="lg"
                    variant="secondary"
                    onClick={onJoinClick}
                    disabled={isPending}
                    className="w-full"
                  >
                    {isPending ? (
                      <Loader2
                        className="mr-2 h-4 w-4 animate-spin"
                        aria-hidden
                      />
                    ) : null}
                    Join Game
                  </Button>
                </div>
              </form>
            </Form>
            <p className="text-muted text-center text-xs">
              Display names are shared with the lobby and must be unique per
              game.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
