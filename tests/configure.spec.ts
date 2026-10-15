import { test, expect, type Page } from '@playwright/test';

import { logIn } from './support/auth';
import {
  chooseInterviewer,
  chooseProfile,
  sendMessage,
  startInterviewerChat,
} from './support/configure';
import { configuration, configurationBlock, createProfile } from './support/data';

const conversation = (page: Page) => page.getByRole('log', { name: 'Samtale', exact: true });
const saveForm = (page: Page) => page.getByRole('form', { name: 'Lagre agenten', exact: true });

test('the first step is choosing an agent type, and planned types cannot be chosen', async ({
  page,
}) => {
  await logIn(page, '/configure');

  await expect(
    page.getByRole('heading', { name: 'Hva slags agent vil du sette opp?', exact: true }),
  ).toBeVisible();
  // Planned types are shown, but are not buttons.
  await expect(page.getByRole('heading', { name: 'Lærer', exact: true })).toBeVisible();
  await expect(page.getByText('Kommer snart').first()).toBeVisible();
  await expect(page.getByRole('button', { name: /^Lærer/ })).toHaveCount(0);

  await chooseInterviewer(page);
  await page.getByRole('button', { name: 'Bytt agenttype', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Hva slags agent vil du sette opp?', exact: true }),
  ).toBeVisible();
});

test('the configurator can start without any template', async ({ page }) => {
  await logIn(page, '/configure');

  await startInterviewerChat(page);

  await expect(page.getByText('Intervjuer: Ingen mal valgt')).toBeVisible();
  await expect(page.getByText('Jobbsøker: Ingen profil valgt')).toBeVisible();
  await expect(page.getByText('Stilling: Ingen bransjemal valgt')).toBeVisible();
  await expect(conversation(page)).toContainText(
    'Hei! Jeg hjelper deg med å sette opp en AI-intervjuer. Hvilken stilling skal jobbsøkeren øve til?',
  );
});

test('the configurator knows the chosen templates and profile', async ({ page }) => {
  await logIn(page);
  await createProfile(page, { label: 'Profil A', ageRange: '18-24' });
  await page.goto('/configure');
  await chooseInterviewer(page);

  await chooseProfile(page, 'Profil A (18–24 år)');
  await startInterviewerChat(page, { template: 'Daglig leder', industry: 'Butikkmedarbeider' });

  await expect(page.getByText('Intervjuer: Daglig leder')).toBeVisible();
  await expect(page.getByText('Jobbsøker: Profil A')).toBeVisible();
  await expect(page.getByText('Stilling: Butikkmedarbeider')).toBeVisible();
  await expect(conversation(page)).toContainText('Du har valgt malen «Daglig leder».');
  await expect(conversation(page)).toContainText('Du har valgt bransjemalen «Butikkmedarbeider»');
  await expect(conversation(page)).toContainText('Du har valgt jobbsøkerprofilen «Profil A».');
});

test('the industry templates can be filtered by sector', async ({ page }) => {
  await logIn(page, '/configure');
  await chooseInterviewer(page);
  await page.getByRole('button', { name: 'Fortsett uten mal', exact: true }).click();

  await page.getByRole('button', { name: 'Offentlig', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Helsefagarbeider/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Butikkmedarbeider/ })).toHaveCount(0);

  await page.getByRole('button', { name: 'Privat', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Butikkmedarbeider/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Helsefagarbeider/ })).toHaveCount(0);
});

test('changing the template starts the conversation over', async ({ page }) => {
  await logIn(page, '/configure');
  await startInterviewerChat(page, { template: 'Teamleder' });
  await sendMessage(page, 'Butikkmedarbeider');
  await expect(conversation(page)).toContainText('Mock-svar: Butikkmedarbeider');

  await page.getByRole('button', { name: 'Bytt mal eller profil', exact: true }).click();
  // The industry choice is kept, so this goes straight back to the chat.
  await page.getByRole('button', { name: /^HR-medarbeider/ }).click();

  await expect(conversation(page)).toContainText('Du har valgt malen «HR-medarbeider».');
  await expect(conversation(page)).not.toContainText('Mock-svar');
});

test('a finished configuration can be saved as an agent', async ({ page }) => {
  await logIn(page, '/configure');
  await startInterviewerChat(page);

  // A reply without a KONFIGURASJON block does not finish the configuration.
  await sendMessage(page, 'Butikkmedarbeider');
  await expect(conversation(page)).toContainText('Mock-svar: Butikkmedarbeider');
  await expect(saveForm(page)).toBeHidden();

  // The mock echoes the message, so its reply is a finished configuration.
  await sendMessage(page, configurationBlock());
  await expect(saveForm(page)).toBeVisible();
  await expect(saveForm(page).getByRole('textbox', { name: /^Navn på agenten/ })).toHaveValue(
    'Intervjuer for Butikkmedarbeider',
  );

  await saveForm(page).getByRole('button', { name: 'Lagre agent', exact: true }).click();

  await expect(page.getByText('«Intervjuer for Butikkmedarbeider» er lagret.')).toBeVisible();
  await page.getByRole('link', { name: 'se agentene dine', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Intervjuer for Butikkmedarbeider', exact: true }),
  ).toBeVisible();
});

test('the language model can be chosen when saving', async ({ page }) => {
  await logIn(page, '/configure');
  await startInterviewerChat(page);
  await sendMessage(page, configurationBlock());

  // The button also shows a summary of the settings, so its name goes on.
  await saveForm(page)
    .getByRole('button', { name: /^Avanserte innstillinger/ })
    .click();
  await page.getByRole('combobox', { name: 'Språkmodell', exact: true }).click();
  await page.getByRole('option', { name: 'mock/test-model', exact: true }).click();
  await saveForm(page).getByRole('button', { name: 'Lagre agent', exact: true }).click();
  await page.getByRole('link', { name: 'se agentene dine', exact: true }).click();
  await page.getByRole('link', { name: /Intervjuer for Butikkmedarbeider/ }).click();

  await page.getByRole('button', { name: 'Avanserte innstillinger', exact: true }).click();
  await expect(page.getByRole('definition').filter({ hasText: 'mock/test-model' })).toBeVisible();
});

test('the saved agent can be tested straight from the configurator', async ({ page }) => {
  await logIn(page, '/configure');
  await startInterviewerChat(page);
  await sendMessage(page, configurationBlock());

  await page.getByRole('textbox', { name: /^Navn på agenten/ }).fill('Min intervjuer');
  await page.getByRole('button', { name: 'Lagre agent', exact: true }).click();
  await page.getByRole('link', { name: 'Test agenten', exact: true }).click();

  await expect(page).toHaveURL(/\/test-chat\?agent=/);
  await expect(conversation(page)).toContainText('Hei, og velkommen til intervjuet.');
});

test('the templates and profile fill in their answers', async ({ page }) => {
  await logIn(page);
  await createProfile(page, { label: 'Profil A', ageRange: '30-39' });
  await page.goto('/configure');
  await chooseInterviewer(page);
  await chooseProfile(page, 'Profil A');
  await startInterviewerChat(page, { template: 'Daglig leder', industry: 'Butikkmedarbeider' });

  // Only the answers no template or profile decided: they fill in the rest.
  await sendMessage(
    page,
    configurationBlock({
      ...configuration,
      stilling: undefined,
      bransje: undefined,
      intervjuer: undefined,
      jobbsoker: undefined,
    }),
  );
  await page.getByRole('button', { name: 'Lagre agent', exact: true }).click();
  await page.getByRole('link', { name: 'se agentene dine', exact: true }).click();
  await page.getByRole('link', { name: /Intervjuer for Butikkmedarbeider/ }).click();

  await expect(
    page.getByRole('definition').filter({ hasText: /^Intervjueren er daglig leder/ }),
  ).toBeVisible();
  await expect(page.getByRole('definition').filter({ hasText: /30–39 år/ })).toBeVisible();
  await expect(
    page.getByRole('definition').filter({ hasText: /^Butikkmedarbeider\. / }),
  ).toBeVisible();

  // The agent remembers where the answers came from.
  await page.getByRole('link', { name: 'Rediger', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Intervjuermal', exact: true })).toHaveText(
    'Daglig leder',
  );
  await expect(page.getByRole('combobox', { name: 'Jobbsøkerprofil', exact: true })).toHaveText(
    /^Profil A/,
  );
});
