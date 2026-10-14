import { test, expect } from '@playwright/test';

test('start page shows the heading without logging in', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: 'Konfigurator for intervjuagenter' }),
  ).toBeVisible();
});
