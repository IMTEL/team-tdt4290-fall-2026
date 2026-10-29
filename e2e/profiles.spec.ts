import { test, expect } from '@playwright/test';

import { logIn } from './support/auth';
import { createProfile } from './support/data';

test('a counsellor can create and delete a job seeker template', async ({ page }) => {
  await logIn(page, '/profiles');
  await expect(page.getByText('Du har ingen maler ennå.')).toBeVisible();

  await page.getByRole('link', { name: 'Lag en ny mal', exact: true }).click();
  await page.getByRole('textbox', { name: 'Navn på malen', exact: true }).fill('Profil A');
  await page.getByRole('textbox', { name: 'Språk', exact: true }).fill('Norsk B1, Arabisk');
  await page.getByRole('button', { name: 'Lagre mal', exact: true }).click();

  await expect(page).toHaveURL('/templates');
  await expect(page.getByText('Jobbsøkermal laget', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Profil A', exact: true })).toBeVisible();

  await page.goto('/profiles');
  await page.getByRole('button', { name: 'Slett Profil A', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Slett', exact: true }).click();
  await expect(page.getByText('Du har ingen maler ennå.')).toBeVisible();
});

test('a job seeker template shows its age, experience and what to practise', async ({ page }) => {
  await logIn(page, '/profiles/new');

  await page.getByRole('textbox', { name: /^Navn på malen/ }).fill('Profil B');
  await page.getByRole('combobox', { name: 'Aldersgruppe', exact: true }).click();
  await page.getByRole('option', { name: '25–29 år', exact: true }).click();
  await page.getByRole('combobox', { name: 'Arbeidserfaring', exact: true }).click();
  await page.getByRole('option', { name: 'Noe (1–5 år)', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Mestre nervøsitet', exact: true }).check();
  await page.getByRole('textbox', { name: 'Annet', exact: true }).fill('Håndtrykk');
  await page.getByRole('button', { name: 'Lagre mal', exact: true }).click();

  await expect(page).toHaveURL('/templates');
  await expect(page.getByText('Jobbsøkermal laget', { exact: true })).toBeVisible();
  await expect(page.getByText('25–29 år · Noe (1–5 år)')).toBeVisible();

  await page.goto('/profiles');
  const chips = page.getByLabel('Vil øve på');
  await expect(chips).toContainText('Mestre nervøsitet');
  await expect(chips).toContainText('Håndtrykk');
});

test('a job seeker template needs a name, and not too many languages', async ({ page }) => {
  await logIn(page, '/profiles/new');
  const save = page.getByRole('button', { name: 'Lagre mal', exact: true });

  await expect(save).toBeDisabled();
  await page.getByRole('textbox', { name: /^Navn på malen/ }).fill('Profil A');
  await expect(save).toBeEnabled();

  const tooMany = Array.from({ length: 21 }, (_, i) => `Språk ${i + 1}`).join(', ');
  await page.getByRole('textbox', { name: 'Språk', exact: true }).fill(tooMany);
  await expect(page.getByText('Skriv høyst 20 språk.')).toBeVisible();
  await expect(save).toBeDisabled();
});

test('a job seeker template can be edited', async ({ page }) => {
  await logIn(page);
  await createProfile(page, { label: 'Profil A' });
  await page.goto('/profiles');

  await page.getByRole('link', { name: 'Rediger Profil A', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Rediger jobbsøkermal', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('textbox', { name: /^Navn på malen/ })).toHaveValue('Profil A');

  await page.getByRole('combobox', { name: 'Aldersgruppe', exact: true }).click();
  await page.getByRole('option', { name: '30–39 år', exact: true }).click();
  await page.getByRole('button', { name: 'Lagre endringene', exact: true }).click();

  await expect(page).toHaveURL('/templates');
  await expect(page.getByText('Jobbsøkermal lagret', { exact: true })).toBeVisible();
  await expect(page.getByText('30–39 år')).toBeVisible();
});

test('cancelling a delete keeps the job seeker template', async ({ page }) => {
  await logIn(page);
  await createProfile(page, { label: 'Profil A' });
  await page.goto('/profiles');

  await page.getByRole('button', { name: 'Slett Profil A', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Slette malen «Profil A»?');
  await dialog.getByRole('button', { name: 'Avbryt', exact: true }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Profil A', exact: true })).toBeVisible();
});

test('a job seeker template that does not exist shows the not found page', async ({ page }) => {
  await logIn(page, '/profiles/000000000000000000000000/edit');

  await expect(page.getByText('This page could not be found.')).toBeVisible();
});
