import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { mockApi } from './api'

const PAGES = ['/', '/map', '/map?view=list', '/search?q=metro', '/sectors', '/sector/economy', '/social', '/about', '/status']

for (const theme of ['dark', 'light'] as const) {
  for (const path of PAGES) {
    test(`${path} has no serious accessibility issues (${theme})`, async ({ page }) => {
      await mockApi(page)
      await page.addInitScript((t) => localStorage.setItem('eastwire.theme', t), theme)
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await page.waitForLoadState('networkidle')

      const results = await new AxeBuilder({ page })
        // Leaflet's own controls and tiles are third-party markup we do not change.
        .exclude('.leaflet-control-container')
        .exclude('.leaflet-pane')
        .analyze()
      const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
      expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([])
    })
  }
}
