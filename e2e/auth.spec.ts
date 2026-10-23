import { test, expect } from '@playwright/test';

import { logIn } from './support/auth';

test('a signed-out user is sent to the login page', async ({ page }) => {
  await page.goto('/browse-agents');

  await expect(page).toHaveURL(/\/login\?callbackUrl=/);
  await expect(page.getByRole('heading', { name: 'Logg inn', exact: true })).toBeVisible();
});

// Every page that talks to RAGdoll needs a login (src/proxy.ts).
for (const path of [
  '/configure',
  '/create-template',
  '/templates',
  '/profiles',
  '/profiles/new',
  '/test-chat',
  '/browse-agents/some-agent',
]) {
  test(`${path} needs a login`, async ({ page }) => {
    await page.goto(path);

    await expect(page).toHaveURL(/\/login\?callbackUrl=/);
  });
}

test('a signed-out user sees a login link in the navbar', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('link', { name: 'Logg inn', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Logg ut', exact: true })).toBeHidden();
});

test('logging in returns the user to the page they wanted', async ({ page }) => {
  await page.goto('/browse-agents');

  await page.getByRole('button', { name: 'Logg inn', exact: true }).click();

  await expect(page).toHaveURL(/\/browse-agents$/);
  await expect(page.getByText(/^Test Bruker \d+$/)).toBeVisible();
});

test('the login page says so when a login failed', async ({ page }) => {
  await page.goto('/login?error=OAuthCallback');

  await expect(page.getByText('Innloggingen mislyktes. Prøv igjen.')).toBeVisible();
});

test('a logged-in user who opens the login page is sent to the start page', async ({ page }) => {
  await logIn(page);

  await page.goto('/login');

  await expect(page).toHaveURL(/\/$/);
});

test('logging out ends the session', async ({ page }) => {
  await logIn(page);

  await page.getByRole('button', { name: 'Logg ut', exact: true }).click();

  await expect(page).toHaveURL(/\/login/);
  await page.goto('/browse-agents');
  await expect(page).toHaveURL(/\/login\?callbackUrl=/);
});
