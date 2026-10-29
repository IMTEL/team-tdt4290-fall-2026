import { test, expect } from '@playwright/test';

import { logIn } from './support/auth';
import { chooseInterviewer } from './support/configure';
import { createJobTemplate } from './support/data';

// Stillingsmaler the counsellor makes on /templates, and chooses on /configure.

test('a counsellor can add a stillingsmal in a new industry, and choose it for a new interviewer', async ({
  page,
}) => {
  await logIn(page, '/templates');

  await page.getByRole('link', { name: /Ny stillingsmal/ }).click();
  await page.getByRole('textbox', { name: 'Stilling', exact: true }).fill('Lagermedarbeider natt');
  await page.getByRole('combobox', { name: 'Bransje' }).fill('Logistikk');
  await page.getByRole('button', { name: 'Privat', exact: true }).click();
  await page.getByRole('textbox', { name: 'Kort beskrivelse' }).fill('Plukk om natten.');
  await page
    .getByRole('textbox', { name: 'Dette får intervjueren vite om stillingen' })
    .fill('Jobber på et stort lager om natten.');
  await page.getByRole('button', { name: 'Lagre stillingsmal' }).click();
  await expect(page).toHaveURL(/\/templates$/);
  await expect(page.getByText('Mal laget')).toBeVisible();
  await expect(page.getByRole('link', { name: /^Lagermedarbeider natt/ })).toBeVisible();
  // The new industry is listed under Bransjemaler, from the stillingsmal.
  await expect(page.getByRole('link', { name: /^Logistikk/ })).toBeVisible();

  await page.goto('/configure');
  await chooseInterviewer(page);
  await page
    .getByRole('group', { name: 'Stillingsmaler', exact: true })
    .getByRole('button', { name: 'Lagermedarbeider natt', exact: true })
    .click();

  await expect(page.getByRole('textbox', { name: /^Stilling/ })).toHaveValue(
    'Lagermedarbeider natt',
  );
  await expect(
    page
      .getByRole('group', { name: 'Bransje', exact: true })
      .getByRole('button', { name: 'Logistikk', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(
    page
      .getByRole('group', { name: 'Arbeidsgiver', exact: true })
      .getByRole('button', { name: 'Privat', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Neste', exact: true })).toBeEnabled();
});

test('a stillingsmal can be edited and deleted', async ({ page }) => {
  await logIn(page);
  const id = await createJobTemplate(page, { title: 'Lagermedarbeider' });
  await page.goto(`/templates/jobs/${id}`);

  await expect(page.getByText('Egen mal')).toBeVisible();
  await page.getByRole('link', { name: 'Rediger' }).click();
  await page.getByRole('textbox', { name: 'Stilling', exact: true }).fill('Truckfører');
  await page.getByRole('button', { name: 'Lagre endringene' }).click();
  await expect(page.getByText('Mal lagret')).toBeVisible();
  await expect(page.getByRole('link', { name: /^Truckfører/ })).toBeVisible();

  await page.goto(`/templates/jobs/${id}`);
  await page.getByRole('button', { name: 'Slett Truckfører' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Slett', exact: true }).click();
  await expect(page).toHaveURL(/\/templates$/);
  await expect(page.getByText('Mal slettet')).toBeVisible();
  await expect(page.getByRole('link', { name: /^Truckfører/ })).toHaveCount(0);
});

test('a built-in stillingsmal has no edit or delete', async ({ page }) => {
  await logIn(page, '/templates/jobs/helsefagarbeider');

  await expect(page.getByText('Følger med appen')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Rediger' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Slett/ })).toHaveCount(0);
});
