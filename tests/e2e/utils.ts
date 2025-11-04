import type { Browser, Page, Locator } from '@playwright/test'

import type { Game } from '@/server/game/types'

export type LobbySetupResult = {
  hostPage: Page
  rivalPage: Page
  rivalContextClose: () => Promise<void>
  code: string
  hostId: string
  rivalId: string
}

export async function readSession(page: Page) {
  return page.evaluate(() => {
    const raw = window.sessionStorage.getItem('kpop-draft-session')
    return raw
      ? (JSON.parse(raw) as { code: string; playerId: string; displayName: string })
      : null
  })
}

export async function bootstrapLobby(
  browser: Browser,
  hostPage: Page,
  hostName: string,
  rivalName: string,
): Promise<LobbySetupResult> {
  await hostPage.goto('/')
  await hostPage.getByLabel('Display name').fill(hostName)
  await hostPage.getByRole('button', { name: 'Create Game' }).click()
  await hostPage.waitForURL('**/game/*/lobby')

  const hostSession = await readSession(hostPage)
  if (!hostSession) {
    throw new Error('Failed to capture host session')
  }

  const rivalContext = await browser.newContext()
  const rivalPage = await rivalContext.newPage()

  await rivalPage.goto('/')
  await rivalPage.getByLabel('Display name').fill(rivalName)
  const joinButton = rivalPage.getByRole('button', { name: 'Join Game' })
  await joinButton.click()
  await rivalPage.getByLabel('Game code').fill(hostSession.code)
  await joinButton.click()
  await rivalPage.waitForURL(`**/game/${hostSession.code}/lobby`)

  const rivalSession = await readSession(rivalPage)
  if (!rivalSession) {
    throw new Error('Failed to capture rival session')
  }

  return {
    hostPage,
    rivalPage,
    rivalContextClose: () => rivalContext.close(),
    code: hostSession.code,
    hostId: hostSession.playerId,
    rivalId: rivalSession.playerId,
  }
}

export async function fetchGameState(page: Page, code: string): Promise<Game> {
  return page.evaluate(async (gameCode: string) => {
    const response = await fetch(`/api/game/${gameCode}/state`, {
      method: 'GET',
      cache: 'no-store',
    })
    const payload = await response.json()
    return payload.data as Game
  }, code)
}

export async function completeDraftToScenario(
  params: LobbySetupResult,
): Promise<Game> {
  let state = await fetchGameState(params.hostPage, params.code)

  while (state.status === 'drafting') {
    const activePlayerId = state.turnOrder[state.activePickIndex]
    const pickerPage =
      activePlayerId === params.hostId ? params.hostPage : params.rivalPage

    const firstCard = pickerPage.locator('[data-testid="idol-card"]').first()
    await firstCard.waitFor({ state: 'visible' })
    await waitForEnabled(firstCard, params.hostPage)
    const previousIndex = state.activePickIndex
    await firstCard.click()

    await params.hostPage.waitForFunction(
      async ({ gameCode, previousIndex }: { gameCode: string; previousIndex: number }) => {
        const response = await fetch(`/api/game/${gameCode}/state`, {
          cache: 'no-store',
        })
        const payload = await response.json()
        const next = payload.data as Game
        return (
          next.activePickIndex > previousIndex ||
          next.status === 'scenario' ||
          next.status === 'reveal'
        )
      },
      { gameCode: params.code, previousIndex },
    )

    state = await fetchGameState(params.hostPage, params.code)
  }

  return state
}

async function waitForEnabled(locator: Locator, page: Page) {
  // Poll until the element is clickable (disabled attribute removed)
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (!(await locator.isDisabled())) {
      return
    }
    await page.waitForTimeout(50)
  }
  if (await locator.isDisabled()) {
    throw new Error('Card selection remained disabled unexpectedly')
  }
}
