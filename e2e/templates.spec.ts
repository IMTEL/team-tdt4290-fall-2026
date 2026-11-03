import { test, expect } from '@playwright/test';

import { logIn } from './support/auth';
import { chooseInterviewer, fillStilling, goToFinish, INTERVIEWER_STEP } from './support/configure';
import { createTemplate } from './support/data';

test('a counsellor can make a template from the wizard and choose it there', async ({ page }) => {
  await logIn(page, '/configure');
  await chooseInterviewer(page);
  await fillStilling(page);

  await page.getByRole('link', { name: 'Lag en ny intervjuermal', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Lag en mal til å konfigurere en AI-agent', exact: true }),
  ).toBeVisible();
  // The link from the interviewer's templates starts the form as an interviewer template.
  await expect(page.getByRole('combobox', { name: /^Type agent/ })).toHaveText('Intervjuer');

  const save = page.getByRole('button', { name: 'Lagre mal', exact: true });
  await expect(save).toBeDisabled();

  await page.getByRole('textbox', { name: /^Navn på malen/ }).fill('Butikksjef');
  await page.getByRole('textbox', { name: /^Kort beskrivelse/ }).fill('Travel, men vennlig.');
  await page.getByRole('textbox', { name: 'Fokusområder', exact: true }).fill('Service, Samarbeid');
  await page
    .getByRole('textbox', { name: /^Beskrivelse av intervjueren/ })
    .fill('Intervjueren er butikksjef og spør om service.');
  await save.click();

  // Saving goes back to the wizard's interviewer step, with the rest of the wizard kept.
  await expect(page.getByRole('radio', { name: /^Butikksjef/ })).toBeVisible();
  await expect(page.getByText('Travel, men vennlig.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Rediger Butikksjef', exact: true })).toBeVisible();
});

test('a template cannot have too many focus areas', async ({ page }) => {
  await logIn(page, '/create-template');

  await page.getByRole('textbox', { name: /^Navn på malen/ }).fill('Butikksjef');
  await page.getByRole('textbox', { name: /^Kort beskrivelse/ }).fill('Travel, men vennlig.');
  await page.getByRole('textbox', { name: /^Beskrivelse av intervjueren/ }).fill('Butikksjef.');
  await page
    .getByRole('textbox', { name: 'Fokusområder', exact: true })
    .fill('a, b, c, d, e, f, g');

  await expect(page.getByText('Skriv høyst 6 fokusområder.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Lagre mal', exact: true })).toBeDisabled();
});

test('a saved template can be chosen for a new interviewer', async ({ page }) => {
  await logIn(page);
  await createTemplate(page, { title: 'Butikksjef' });
  await page.goto('/configure');

  await goToFinish(page, { interviewer: 'Butikksjef' });

  await expect(
    page
      .getByRole('complementary', { name: 'Seksjoner', exact: true })
      .getByRole('definition')
      .filter({ hasText: 'Butikksjef' }),
  ).toBeVisible();
});

test('a saved template can be edited', async ({ page }) => {
  await logIn(page);
  await createTemplate(page, { title: 'Butikksjef', description: 'Gammel beskrivelse.' });
  await page.goto(INTERVIEWER_STEP);

  await page.getByRole('link', { name: 'Rediger Butikksjef', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Rediger mal', exact: true })).toBeVisible();
  const description = page.getByRole('textbox', { name: /^Kort beskrivelse/ });
  await expect(description).toHaveValue('Gammel beskrivelse.');

  await description.fill('Ny beskrivelse.');
  await expect(page.getByRole('link', { name: 'Avbryt', exact: true })).toHaveAttribute(
    'href',
    /\/configure\?type=interviewer&step=intervjuer/,
  );
  await page.getByRole('button', { name: 'Lagre endringene', exact: true }).click();
  await expect(page).toHaveURL(/\/configure\?type=interviewer&step=intervjuer/);
  await expect(
    page.getByRole('heading', { level: 2, name: 'Velg en intervjuermal', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Ny beskrivelse.')).toBeVisible();
  await expect(page.getByText('Gammel beskrivelse.')).toBeHidden();
});

test('a saved template can be deleted after confirming', async ({ page }) => {
  await logIn(page);
  await createTemplate(page, { title: 'Butikksjef' });
  await page.goto(INTERVIEWER_STEP);
  const card = page.getByRole('heading', { level: 3, name: 'Butikksjef', exact: true });
  await expect(card).toBeVisible();

  await page.getByRole('button', { name: 'Slett Butikksjef', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Slette malen «Butikksjef»?');
  await dialog.getByRole('button', { name: 'Slett', exact: true }).click();

  await expect(card).toBeHidden();
  await page.reload();
  await expect(
    page.getByRole('heading', { level: 2, name: 'Velg en intervjuermal', exact: true }),
  ).toBeVisible();
  await expect(card).toBeHidden();
});

test('a template that does not exist shows the not found page', async ({ page }) => {
  await logIn(page, '/templates/000000000000000000000000/edit');

  await expect(page.getByText('This page could not be found.')).toBeVisible();
});

test('administering lovverk jumps to that group on Maler', async ({ page }) => {
  await logIn(page, INTERVIEWER_STEP);
  await page.getByRole('link', { name: 'Administrer lovverk', exact: true }).click();

  await expect(page).toHaveURL(/\/templates\?seksjon=lovverk/);
  const lovverk = page.getByRole('button', { name: 'Lovverk', exact: true });
  await expect(lovverk).toHaveAttribute('aria-expanded', 'true');
  await expect(lovverk).toBeInViewport();
  await expect(
    page.getByRole('link', { name: /Rettigheter i ansettelsesprosessen/ }),
  ).toBeInViewport();
});

test('the old lovverk page jumps to that group on Maler', async ({ page }) => {
  await logIn(page, '/legal-templates');

  await expect(page).toHaveURL(/\/templates\?seksjon=lovverk/);
  await expect(page.getByRole('button', { name: 'Lovverk', exact: true })).toBeInViewport();
  await expect(
    page.getByRole('link', { name: /Rettigheter i ansettelsesprosessen/ }),
  ).toBeInViewport();
});
