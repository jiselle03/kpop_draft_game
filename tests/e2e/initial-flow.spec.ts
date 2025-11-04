import { test, expect } from '@playwright/test'
import type { Browser, Page } from '@playwright/test'

import { bootstrapLobby, readSession } from './utils'

test('players can create, join, and start a draft', async ({
  browser,
  page,
}: {
  browser: Browser
  page: Page
}) => {
  const { rivalPage, rivalContextClose, code } = await bootstrapLobby(
    browser,
    page,
    'Host Player',
    'Rival Player',
  )

  await expect(page.locator('[data-testid="lobby-player"]')).toHaveCount(2)
  await expect(page.getByTestId('start-draft')).toBeEnabled()

  await page.getByTestId('start-draft').click()

  await page.waitForURL(`**/game/${code}/draft`)
  await rivalPage.waitForURL(`**/game/${code}/draft`)

  await expect(page.locator('[data-testid="idol-card"]')).not.toHaveCount(0)
  await expect(page.locator('[data-testid="idol-card"]').first()).toBeEnabled()

  await rivalContextClose()
})
