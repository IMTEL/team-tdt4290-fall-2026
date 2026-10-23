import { expect, type Page } from '@playwright/test';

/**
 * Logs in through the login page, the way a user does. The mock Keycloak has no password form and
 * makes a new user on every login, so the user starts with no agents, templates or profiles.
 * Returns once the app shows the user's name in the navbar.
 */
export async function logIn(page: Page, path = '/'): Promise<void> {
  await page.goto(`/login?callbackUrl=${encodeURIComponent(path)}`);
  await page.getByRole('button', { name: 'Logg inn', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Logg ut', exact: true })).toBeVisible();
}
