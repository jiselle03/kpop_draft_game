import { test, expect } from '@playwright/test'
import type { Browser, Page } from '@playwright/test'

import { bootstrapLobby, completeDraftToScenario } from './utils'

test('players assign idols in the scenario room and reveal selections', async ({
  browser,
  page,
}: {
  browser: Browser
  page: Page
}) => {
  const setup = await bootstrapLobby(browser, page, 'Leader', 'Wingman')

  // Start the draft
  await page.getByTestId('start-draft').click()
  await page.waitForURL(`**/game/${setup.code}/draft`)
  await setup.rivalPage.waitForURL(`**/game/${setup.code}/draft`)

  const draftState = await completeDraftToScenario(setup)
  expect(draftState.status).toBe('scenario')

  await page.waitForURL(`**/game/${setup.code}/room`)
  await setup.rivalPage.waitForURL(`**/game/${setup.code}/room`)

  await assignAllRoles(setup.hostPage)
  await assignAllRoles(setup.rivalPage)

  await page.getByRole('button', { name: 'Submit selections' }).click()
  await setup.rivalPage.getByRole('button', { name: 'Submit selections' }).click()

  await page.waitForSelector('text=Reveal live')
  await expect(page.getByText('Reveal live')).toBeVisible()
  await expect(setup.rivalPage.getByText('Reveal live')).toBeVisible()

  await setup.rivalContextClose()
})

async function assignAllRoles(page: Page) {
  await expect(page.locator('[data-testid="scenario-role"]')).not.toHaveCount(0)
  const roleButtons = page.locator('[data-testid="scenario-role"]')
  const roleCount = await roleButtons.count()

  for (let index = 0; index < roleCount; index += 1) {
    await roleButtons.nth(index).click()
    const rosterCard = page
      .locator('[data-testid="scenario-roster-card"]:not([disabled])')
      .first()
    await rosterCard.waitFor({ state: 'visible' })
    await rosterCard.click()
    await page.waitForTimeout(50)
  }
}
