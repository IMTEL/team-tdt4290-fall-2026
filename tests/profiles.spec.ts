import { test, expect } from '@playwright/test';

import { logIn } from './support/auth';
import { createProfile } from './support/data';

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

test('a profile shows its age, experience and what to practise', async ({ page }) => {
  await logIn(page, '/profiles/new');

  await page.getByRole('textbox', { name: /^Navn på profilen/ }).fill('Profil B');
  await page.getByRole('combobox', { name: 'Aldersgruppe' }).click();
  await page.getByRole('option', { name: '25–29 år' }).click();
  await page.getByRole('combobox', { name: 'Arbeidserfaring' }).click();
  await page.getByRole('option', { name: 'Noe (1–5 år)' }).click();
  await page.getByRole('checkbox', { name: 'Mestre nervøsitet' }).check();
  await page.getByRole('textbox', { name: 'Annet' }).fill('Håndtrykk');
  await page.getByRole('button', { name: 'Lagre profil' }).click();
  await page.getByRole('link', { name: 'Se profilene dine' }).click();

  await expect(page.getByText('25–29 år · Noe (1–5 år)')).toBeVisible();
  const chips = page.getByLabel('Vil øve på');
  await expect(chips).toContainText('Mestre nervøsitet');
  await expect(chips).toContainText('Håndtrykk');
});

test('a profile needs a name, and not too many languages', async ({ page }) => {
  await logIn(page, '/profiles/new');
  const save = page.getByRole('button', { name: 'Lagre profil' });

  await expect(save).toBeDisabled();
  await page.getByRole('textbox', { name: /^Navn på profilen/ }).fill('Profil A');
  await expect(save).toBeEnabled();

  const tooMany = Array.from({ length: 21 }, (_, i) => `Språk ${i + 1}`).join(', ');
  await page.getByRole('textbox', { name: 'Språk' }).fill(tooMany);
  await expect(page.getByText('Skriv høyst 20 språk.')).toBeVisible();
  await expect(save).toBeDisabled();
});

test('a profile can be edited', async ({ page }) => {
  await logIn(page);
  await createProfile(page, { label: 'Profil A' });
  await page.goto('/profiles');

  await page.getByRole('link', { name: 'Rediger Profil A' }).click();
  await expect(page.getByRole('heading', { name: 'Rediger jobbsøkerprofil' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: /^Navn på profilen/ })).toHaveValue('Profil A');

  await page.getByRole('combobox', { name: 'Aldersgruppe' }).click();
  await page.getByRole('option', { name: '30–39 år' }).click();
  await page.getByRole('button', { name: 'Lagre endringene' }).click();
  await expect(page.getByText('Profilen «Profil A» er lagret.')).toBeVisible();

  await page.getByRole('link', { name: 'Se profilene dine' }).click();
  await expect(page.getByText('30–39 år')).toBeVisible();
});

test('cancelling a delete keeps the profile', async ({ page }) => {
  await logIn(page);
  await createProfile(page, { label: 'Profil A' });
  await page.goto('/profiles');

  await page.getByRole('button', { name: 'Slett Profil A' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Slette profilen «Profil A»?');
  await dialog.getByRole('button', { name: 'Avbryt' }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Profil A' })).toBeVisible();
});

test('a profile that does not exist shows the not found page', async ({ page }) => {
  await logIn(page, '/profiles/000000000000000000000000/edit');

  await expect(page.getByText('This page could not be found.')).toBeVisible();
});
