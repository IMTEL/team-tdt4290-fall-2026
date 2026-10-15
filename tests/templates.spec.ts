import { test, expect } from '@playwright/test';

import { logIn } from './support/auth';
import { chooseInterviewer, startInterviewerChat } from './support/configure';
import { createTemplate } from './support/data';

test('a counsellor can make a template and find it on the configure page', async ({ page }) => {
  await logIn(page, '/configure');
  await chooseInterviewer(page);

  await page.getByRole('link', { name: 'Lag en ny mal', exact: true }).click();
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

  await expect(page.getByText('Malen «Butikksjef» er lagret.')).toBeVisible();
  await page.getByRole('link', { name: 'Bruk den til å sette opp en agent', exact: true }).click();
  await chooseInterviewer(page);

  await expect(
    page.getByRole('heading', { level: 3, name: 'Butikksjef', exact: true }),
  ).toBeVisible();
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

test('a saved template can be used to start the configurator', async ({ page }) => {
  await logIn(page);
  await createTemplate(page, { title: 'Butikksjef' });
  await page.goto('/configure');

  await startInterviewerChat(page, { template: 'Butikksjef' });

  await expect(page.getByRole('log', { name: 'Samtale', exact: true })).toContainText(
    'Du har valgt malen «Butikksjef».',
  );
});

test('a saved template can be edited', async ({ page }) => {
  await logIn(page);
  await createTemplate(page, { title: 'Butikksjef', description: 'Gammel beskrivelse.' });
  await page.goto('/configure');
  await chooseInterviewer(page);

  await page.getByRole('link', { name: 'Rediger Butikksjef', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Rediger mal', exact: true })).toBeVisible();
  const description = page.getByRole('textbox', { name: /^Kort beskrivelse/ });
  await expect(description).toHaveValue('Gammel beskrivelse.');

  await description.fill('Ny beskrivelse.');
  await page.getByRole('button', { name: 'Lagre endringene', exact: true }).click();
  await expect(page.getByText('Malen «Butikksjef» er lagret.')).toBeVisible();

  await page.goto('/configure');
  await chooseInterviewer(page);
  await expect(page.getByText('Ny beskrivelse.')).toBeVisible();
  await expect(page.getByText('Gammel beskrivelse.')).toBeHidden();
});

test('a saved template can be deleted after confirming', async ({ page }) => {
  await logIn(page);
  await createTemplate(page, { title: 'Butikksjef' });
  await page.goto('/configure');
  await chooseInterviewer(page);
  const card = page.getByRole('heading', { level: 3, name: 'Butikksjef', exact: true });
  await expect(card).toBeVisible();

  await page.getByRole('button', { name: 'Slett Butikksjef', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Slette malen «Butikksjef»?');
  await dialog.getByRole('button', { name: 'Slett', exact: true }).click();

  await expect(card).toBeHidden();
  await page.reload();
  await chooseInterviewer(page);
  await expect(
    page.getByRole('heading', { level: 2, name: 'Velg en mal', exact: true }),
  ).toBeVisible();
  await expect(card).toBeHidden();
});

test('a template that does not exist shows the not found page', async ({ page }) => {
  await logIn(page, '/templates/000000000000000000000000/edit');

  await expect(page.getByText('This page could not be found.')).toBeVisible();
});
