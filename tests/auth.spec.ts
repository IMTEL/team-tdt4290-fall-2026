import { test, expect } from '@playwright/test';

import { logIn } from './support/auth';

test('a signed-out user is sent to the login page', async ({ page }) => {
  await page.goto('/browse-agents');

  await expect(page).toHaveURL(/\/login\?callbackUrl=/);
  await expect(page.getByRole('heading', { name: 'Logg inn' })).toBeVisible();
});

test('logging in returns the user to the page they wanted', async ({ page }) => {
  await page.goto('/browse-agents');

  await page.getByRole('button', { name: 'Logg inn' }).click();

  await expect(page).toHaveURL(/\/browse-agents$/);
  await expect(page.getByText(/^Test Bruker \d+$/)).toBeVisible();
});

test('logging out ends the session', async ({ page }) => {
  await logIn(page);

  await page.getByRole('button', { name: 'Logg ut' }).click();

  await expect(page).toHaveURL(/\/login/);
  await page.goto('/browse-agents');
  await expect(page).toHaveURL(/\/login\?callbackUrl=/);
});
