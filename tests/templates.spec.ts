import { test, expect } from '@playwright/test';

import { logIn } from './support/auth';
import { createTemplate } from './support/data';

test('a counsellor can make a template and find it on the configure page', async ({ page }) => {
  await logIn(page, '/configure');

  await page.getByRole('link', { name: 'Lag en ny mal' }).click();
  await expect(
    page.getByRole('heading', { name: 'Lag en mal til å konfigurere en AI-agent' }),
  ).toBeVisible();

  const save = page.getByRole('button', { name: 'Lagre mal' });
  await expect(save).toBeDisabled();

  await page.getByRole('textbox', { name: /^Navn på malen/ }).fill('Butikksjef');
  await page.getByRole('textbox', { name: /^Kort beskrivelse/ }).fill('Travel, men vennlig.');
  await page.getByRole('textbox', { name: 'Fokusområder' }).fill('Service, Samarbeid');
  await page
    .getByRole('textbox', { name: /^Beskrivelse av intervjueren/ })
    .fill('Intervjueren er butikksjef og spør om service.');
  await save.click();

  await expect(page.getByText('Malen «Butikksjef» er lagret.')).toBeVisible();
  await page.getByRole('link', { name: 'Bruk den til å sette opp en intervjuer' }).click();

  await expect(page.getByRole('heading', { level: 3, name: 'Butikksjef' })).toBeVisible();
  await expect(page.getByText('Travel, men vennlig.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Rediger Butikksjef' })).toBeVisible();
});

test('a template cannot have too many focus areas', async ({ page }) => {
  await logIn(page, '/create-template');

  await page.getByRole('textbox', { name: /^Navn på malen/ }).fill('Butikksjef');
  await page.getByRole('textbox', { name: /^Kort beskrivelse/ }).fill('Travel, men vennlig.');
  await page.getByRole('textbox', { name: /^Beskrivelse av intervjueren/ }).fill('Butikksjef.');
  await page.getByRole('textbox', { name: 'Fokusområder' }).fill('a, b, c, d, e, f, g');

  await expect(page.getByText('Skriv høyst 6 fokusområder.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Lagre mal' })).toBeDisabled();
});

test('a saved template can be used to start the configurator', async ({ page }) => {
  await logIn(page);
  await createTemplate(page, { title: 'Butikksjef' });
  await page.goto('/configure');

  await page.getByRole('button', { name: /^Butikksjef/ }).click();

  await expect(page.getByRole('log', { name: 'Samtale' })).toContainText(
    'Du har valgt malen «Butikksjef».',
  );
});

test('a saved template can be edited', async ({ page }) => {
  await logIn(page);
  await createTemplate(page, { title: 'Butikksjef', description: 'Gammel beskrivelse.' });
  await page.goto('/configure');

  await page.getByRole('link', { name: 'Rediger Butikksjef' }).click();
  await expect(page.getByRole('heading', { name: 'Rediger mal' })).toBeVisible();
  const description = page.getByRole('textbox', { name: /^Kort beskrivelse/ });
  await expect(description).toHaveValue('Gammel beskrivelse.');

  await description.fill('Ny beskrivelse.');
  await page.getByRole('button', { name: 'Lagre endringene' }).click();
  await expect(page.getByText('Malen «Butikksjef» er lagret.')).toBeVisible();

  await page.goto('/configure');
  await expect(page.getByText('Ny beskrivelse.')).toBeVisible();
  await expect(page.getByText('Gammel beskrivelse.')).toBeHidden();
});

test('a saved template can be deleted after confirming', async ({ page }) => {
  await logIn(page);
  await createTemplate(page, { title: 'Butikksjef' });
  await page.goto('/configure');
  const card = page.getByRole('heading', { level: 3, name: 'Butikksjef' });
  await expect(card).toBeVisible();

  await page.getByRole('button', { name: 'Slett Butikksjef' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Slette malen «Butikksjef»?');
  await dialog.getByRole('button', { name: 'Slett' }).click();

  await expect(card).toBeHidden();
  await page.reload();
  await expect(page.getByRole('heading', { level: 2, name: 'Velg en mal' })).toBeVisible();
  await expect(card).toBeHidden();
});

test('a template that does not exist shows the not found page', async ({ page }) => {
  await logIn(page, '/templates/000000000000000000000000/edit');

  await expect(page.getByText('This page could not be found.')).toBeVisible();
});
