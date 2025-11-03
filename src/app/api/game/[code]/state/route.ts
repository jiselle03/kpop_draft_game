import { NextResponse } from 'next/server'

import { getGame } from '@/server/game/store'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params
  const result = await getGame(code)

  if (!result.ok) {
    const status =
      result.error.code === 'not_found'
        ? 404
        : result.error.code === 'invalid_state'
          ? 409
          : 400
    return NextResponse.json(
      {
        ok: false,
        error: result.error,
      },
      { status },
    )
  }

  return NextResponse.json({
    ok: true,
    data: result.data,
  })
}
