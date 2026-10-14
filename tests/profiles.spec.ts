import { test, expect } from '@playwright/test';

import { logIn } from './support/auth';

test('a counsellor can create and delete a job seeker profile', async ({ page }) => {
  await logIn(page, '/profiles');
  await expect(page.getByText('Du har ingen profiler ennå.')).toBeVisible();

  await page.getByRole('link', { name: 'Lag en ny profil' }).click();
  await page.getByRole('textbox', { name: 'Navn på profilen' }).fill('Profil A');
  await page.getByRole('textbox', { name: 'Språk' }).fill('Norsk B1, Arabisk');
  await page.getByRole('button', { name: 'Lagre profil' }).click();
  await expect(page.getByText('Profilen «Profil A» er lagret.')).toBeVisible();

  await page.getByRole('link', { name: 'Se profilene dine' }).click();
  await expect(page.getByRole('heading', { name: 'Profil A' })).toBeVisible();

  await page.getByRole('button', { name: 'Slett Profil A' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Slett' }).click();
  await expect(page.getByText('Du har ingen profiler ennå.')).toBeVisible();
});
