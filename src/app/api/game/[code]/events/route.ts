'use server'

import { NextResponse } from 'next/server'

import {
  buildGameBroadcast,
  getGame,
  subscribeToGame,
} from '@/server/game/store'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params
  const normalized = code.trim().toUpperCase()
  const initial = await getGame(normalized)

  if (!initial.ok) {
    const status =
      initial.error.code === 'not_found'
        ? 404
        : initial.error.code === 'invalid_state'
          ? 409
          : 400
    return NextResponse.json(
      {
        ok: false,
        error: initial.error,
      },
      { status },
    )
  }

  const encoder = new TextEncoder()

  let cleanup: (() => void) | null = null

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        const payload =
          typeof data === 'string' ? data : JSON.stringify(data ?? null)
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${payload}\n\n`),
        )
      }

      const initialPayload = await buildGameBroadcast(initial.data)
      send('game:update', initialPayload)

      const unsubscribe = await subscribeToGame(normalized, (payload) => {
        send('game:update', payload)
      })

      const keepAlive = setInterval(() => {
        send('ping', Date.now())
      }, 25_000)

      const close = () => {
        clearInterval(keepAlive)
        unsubscribe()
        controller.close()
        cleanup = null
      }

      cleanup = close
      request.signal.addEventListener('abort', close, { once: true })
    },
    cancel() {
      cleanup?.()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store, no-transform',
      Connection: 'keep-alive',
    },
  })
}
