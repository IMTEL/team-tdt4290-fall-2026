import { test, expect, type Page } from '@playwright/test';

import { logIn } from './support/auth';
import { configuration, configurationBlock, createProfile } from './support/data';

const conversation = (page: Page) => page.getByRole('log', { name: 'Samtale', exact: true });

async function sendMessage(page: Page, text: string) {
  await page.getByRole('textbox', { name: 'Melding', exact: true }).fill(text);
  await page.getByRole('button', { name: 'Send', exact: true }).click();
}

test('the configurator can start without a template', async ({ page }) => {
  await logIn(page, '/configure');

  await page.getByRole('button', { name: 'Fortsett uten mal', exact: true }).click();

  await expect(page.getByText('Intervjuer: Ingen mal valgt')).toBeVisible();
  await expect(page.getByText('Jobbsøker: Ingen profil valgt')).toBeVisible();
  await expect(conversation(page)).toContainText(
    'Hei! Jeg hjelper deg med å sette opp en AI-intervjuer. Hvilken stilling skal jobbsøkeren øve til?',
  );
});

test('the configurator knows the chosen template and profile', async ({ page }) => {
  await logIn(page);
  await createProfile(page, { label: 'Profil A', ageRange: '18-24' });
  await page.goto('/configure');

  await page.getByRole('combobox', { name: 'Jobbsøkerprofil', exact: true }).click();
  await page.getByRole('option', { name: 'Profil A (18–24 år)', exact: true }).click();
  await page.getByRole('button', { name: /^Daglig leder/ }).click();

  await expect(page.getByText('Intervjuer: Daglig leder')).toBeVisible();
  await expect(page.getByText('Jobbsøker: Profil A')).toBeVisible();
  await expect(conversation(page)).toContainText('Du har valgt malen «Daglig leder».');
  await expect(conversation(page)).toContainText('Du har valgt jobbsøkerprofilen «Profil A».');
});

test('changing the template starts the conversation over', async ({ page }) => {
  await logIn(page, '/configure');
  await page.getByRole('button', { name: /^Teamleder/ }).click();
  await sendMessage(page, 'Butikkmedarbeider');
  await expect(conversation(page)).toContainText('Mock-svar: Butikkmedarbeider');

  await page.getByRole('button', { name: 'Bytt mal eller profil', exact: true }).click();
  await page.getByRole('button', { name: /^HR-medarbeider/ }).click();

  await expect(conversation(page)).toContainText('Du har valgt malen «HR-medarbeider».');
  await expect(conversation(page)).not.toContainText('Mock-svar');
});

test('a finished configuration can be saved as an agent', async ({ page }) => {
  await logIn(page, '/configure');
  await page.getByRole('button', { name: 'Fortsett uten mal', exact: true }).click();

  // A reply without a KONFIGURASJON block does not finish the configuration.
  await sendMessage(page, 'Butikkmedarbeider');
  await expect(conversation(page)).toContainText('Mock-svar: Butikkmedarbeider');
  await expect(page.getByRole('form', { name: 'Lagre intervjueren', exact: true })).toBeHidden();

  // The mock echoes the message, so its reply is a finished configuration.
  await sendMessage(page, configurationBlock());
  const form = page.getByRole('form', { name: 'Lagre intervjueren', exact: true });
  await expect(form).toBeVisible();
  await expect(form.getByRole('textbox', { name: /^Navn på intervjueren/ })).toHaveValue(
    'Intervjuer for Butikkmedarbeider',
  );

  await form.getByRole('button', { name: 'Lagre agent', exact: true }).click();

  await expect(page.getByText('«Intervjuer for Butikkmedarbeider» er lagret.')).toBeVisible();
  await page.getByRole('link', { name: 'se agentene dine', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Intervjuer for Butikkmedarbeider', exact: true }),
  ).toBeVisible();
});

test('the saved agent can be tested straight from the configurator', async ({ page }) => {
  await logIn(page, '/configure');
  await page.getByRole('button', { name: 'Fortsett uten mal', exact: true }).click();
  await sendMessage(page, configurationBlock());

  await page.getByRole('textbox', { name: /^Navn på intervjueren/ }).fill('Min intervjuer');
  await page.getByRole('button', { name: 'Lagre agent', exact: true }).click();
  await page.getByRole('link', { name: 'Test intervjueren', exact: true }).click();

  await expect(page).toHaveURL(/\/test-chat\?agent=/);
  await expect(conversation(page)).toContainText('Hei, og velkommen til intervjuet.');
});

test('the template and profile decide the interviewer and the job seeker', async ({ page }) => {
  await logIn(page);
  await createProfile(page, { label: 'Profil A', ageRange: '30-39' });
  await page.goto('/configure');
  await page.getByRole('combobox', { name: 'Jobbsøkerprofil', exact: true }).click();
  await page.getByRole('option', { name: /^Profil A/ }).click();
  await page.getByRole('button', { name: /^Daglig leder/ }).click();

  // Without the Intervjuer and Jobbsøker lines: the template and profile fill them in.
  await sendMessage(
    page,
    configurationBlock({ ...configuration, intervjuer: undefined, jobbsoker: undefined }),
  );
  await page.getByRole('button', { name: 'Lagre agent', exact: true }).click();
  await page.getByRole('link', { name: 'se agentene dine', exact: true }).click();
  await page.getByRole('link', { name: /Intervjuer for Butikkmedarbeider/ }).click();

  await expect(
    page.getByRole('definition').filter({ hasText: /^Intervjueren er daglig leder/ }),
  ).toBeVisible();
  await expect(page.getByRole('definition').filter({ hasText: /30–39 år/ })).toBeVisible();

  // The agent remembers where the answers came from.
  await page.getByRole('link', { name: 'Rediger', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Intervjuermal', exact: true })).toHaveText(
    'Daglig leder',
  );
  await expect(page.getByRole('combobox', { name: 'Jobbsøkerprofil', exact: true })).toHaveText(
    /^Profil A/,
  );
});
