import { test, expect, type Page } from '@playwright/test';

import { logIn } from './support/auth';
import {
  chooseInterviewer,
  fillSettings,
  fillStilling,
  goToFinish,
  pickTemplate,
} from './support/configure';
import { createProfile } from './support/data';

const conversation = (page: Page) => page.getByRole('log', { name: 'Samtale', exact: true });
const sections = (page: Page) =>
  page.getByRole('complementary', { name: 'Seksjoner', exact: true });

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
  await fillStilling(page);
  await page.getByRole('button', { name: 'Bytt agenttype', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Hva slags agent vil du sette opp?', exact: true }),
  ).toBeVisible();
});

test('the stilling step needs a job title, a job template, an industry and an employer', async ({
  page,
}) => {
  await logIn(page, '/configure');
  await chooseInterviewer(page);
  const next = page.getByRole('button', { name: 'Neste', exact: true });

  await expect(next).toBeDisabled();
  await page.getByRole('textbox', { name: /^Stilling/ }).fill('Butikkmedarbeider');
  await page.getByRole('button', { name: 'Ingen mal', exact: true }).click();
  await page.getByRole('button', { name: 'Ingen bransje', exact: true }).click();
  await expect(next).toBeDisabled();
  await page.getByRole('button', { name: 'Ikke oppgitt', exact: true }).click();
  await expect(next).toBeEnabled();

  await next.click();
  await expect(
    page.getByRole('heading', { level: 2, name: 'Velg en mal', exact: true }),
  ).toBeVisible();
});

test('the settings step needs the interview type, difficulty, number of questions and follow-ups', async ({
  page,
}) => {
  await logIn(page, '/configure');
  await chooseInterviewer(page);
  await fillStilling(page);
  await pickTemplate(page, null);
  await pickTemplate(page, null);
  const next = page.getByRole('button', { name: 'Neste', exact: true });

  await expect(next).toBeDisabled();
  await page.getByRole('button', { name: 'Første intervju', exact: true }).click();
  await page.getByRole('button', { name: 'Lett', exact: true }).click();
  await page.getByRole('button', { name: '5–6', exact: true }).click();
  await expect(next).toBeDisabled();
  await page.getByRole('button', { name: 'Ja', exact: true }).click();
  await expect(next).toBeEnabled();
});

test('a finished interviewer can be published and is listed under Agenter', async ({ page }) => {
  await logIn(page, '/configure');
  await goToFinish(page);

  await expect(page.getByRole('textbox', { name: /^Navn på agenten/ })).toHaveValue(
    'Intervjuer for Butikkmedarbeider',
  );
  await page.getByRole('button', { name: 'Publiser', exact: true }).click();

  await expect(page).toHaveURL(/\/browse-agents$/);
  await expect(page.getByText('Agent lagret', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: /Intervjuer for Butikkmedarbeider/ }).click();
  await expect(
    page
      .getByRole('tabpanel')
      .getByRole('definition')
      .filter({ hasText: /^Butikkmedarbeider\. / }),
  ).toBeVisible();
  await expect(
    page.getByRole('tabpanel').getByRole('definition').filter({ hasText: 'Varehandel (privat)' }),
  ).toBeVisible();
  await expect(
    page.getByRole('tabpanel').getByRole('definition').filter({ hasText: 'første intervju' }),
  ).toBeVisible();
});

test('the last step says how the answers shape the interviewer', async ({ page }) => {
  await logIn(page, '/configure');
  await goToFinish(page);

  const effects = page.getByRole('region', { name: 'Slik former svarene dine agenten' });
  await expect(
    effects.getByRole('definition').filter({ hasText: 'Ingen mal er valgt' }),
  ).toBeVisible();
  await expect(
    effects.getByRole('definition').filter({ hasText: '5–6 spørsmål i alt' }),
  ).toBeVisible();
});

test('the last step shows what was chosen, and a section can be opened again', async ({ page }) => {
  await logIn(page, '/configure');
  await goToFinish(page, { interviewer: 'Daglig leder' });

  const interviewer = sections(page)
    .getByRole('listitem')
    .filter({
      has: page.getByRole('button', { name: 'Intervjuer', exact: true }),
    });
  // The first line is the template; the legal template comes after it.
  const interviewerTemplate = interviewer.getByRole('definition').first();
  await expect(interviewerTemplate).toHaveText('Daglig leder');
  await expect(sections(page).getByRole('definition').filter({ hasText: 'Lett' })).toBeVisible();

  await sections(page).getByRole('button', { name: 'Intervjuer', exact: true }).click();
  await expect(page.getByRole('radio', { name: /^Daglig leder/ })).toBeChecked();
  await pickTemplate(page, 'HR-medarbeider');
  await pickTemplate(page, null);
  await page.getByRole('button', { name: 'Neste', exact: true }).click();
  await expect(interviewerTemplate).toHaveText('HR-medarbeider');
});

test('the chosen templates fill in the answers, and the agent remembers them', async ({ page }) => {
  await logIn(page);
  await createProfile(page, { label: 'Profil A', ageRange: '30-39' });
  await page.goto('/configure');
  await goToFinish(page, { interviewer: 'Daglig leder', jobSeeker: 'Profil A' });

  await page.getByRole('button', { name: 'Publiser', exact: true }).click();
  await page.getByRole('link', { name: /Intervjuer for Butikkmedarbeider/ }).click();

  await expect(
    page
      .getByRole('tabpanel')
      .getByRole('definition')
      .filter({ hasText: /^Intervjueren er daglig leder/ }),
  ).toBeVisible();
  await expect(
    page
      .getByRole('tabpanel')
      .getByRole('definition')
      .filter({ hasText: /30–39 år/ }),
  ).toBeVisible();

  // The agent remembers where the answers came from.
  await page.getByRole('link', { name: 'Rediger', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Intervjuermal', exact: true })).toHaveText(
    'Daglig leder',
  );
  await expect(page.getByRole('combobox', { name: 'Jobbsøkermal', exact: true })).toHaveText(
    /^Profil A/,
  );
});

test('the language model can be chosen in the settings', async ({ page }) => {
  await logIn(page, '/configure');
  await chooseInterviewer(page);
  await fillStilling(page);
  await pickTemplate(page, null);
  await pickTemplate(page, null);

  // The button also shows a summary of the settings, so its name goes on.
  await page.getByRole('button', { name: /^Avanserte innstillinger/ }).click();
  await page.getByRole('combobox', { name: 'Språkmodell', exact: true }).click();
  await page.getByRole('option', { name: 'mock/test-model', exact: true }).click();
  await fillSettings(page);
  await expect(
    sections(page).getByRole('definition').filter({ hasText: 'mock/test-model' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Publiser', exact: true }).click();
  await page.getByRole('link', { name: /Intervjuer for Butikkmedarbeider/ }).click();

  await page.getByRole('tab', { name: 'Avanserte innstillinger', exact: true }).click();
  await expect(
    page.getByRole('tabpanel').getByRole('definition').filter({ hasText: 'mock/test-model' }),
  ).toBeVisible();
});

test('the agent can be tested straight from the last step', async ({ page }) => {
  await logIn(page, '/configure');
  await goToFinish(page);

  await page.getByRole('textbox', { name: /^Navn på agenten/ }).fill('Min intervjuer');
  await page.getByRole('button', { name: 'Test agenten', exact: true }).click();

  await expect(page).toHaveURL(/\/test-chat\?agent=/);
  await expect(conversation(page)).toContainText('Hei, og velkommen til intervjuet.');
});

test('an unfinished interviewer can be saved as a draft and continued', async ({ page }) => {
  await logIn(page, '/configure');
  await chooseInterviewer(page);
  await fillStilling(page, { jobTitle: 'Kassemedarbeider' });

  await sections(page).getByRole('button', { name: 'Lagre utkast', exact: true }).click();

  await expect(page).toHaveURL(/\/browse-agents$/);
  await expect(page.getByText('Utkast lagret', { exact: true })).toBeVisible();
  const draft = page.getByRole('link', { name: /Fortsett fra: Intervjuer/ });
  await expect(draft).toContainText('Utkast');

  await draft.click();
  await expect(
    page.getByRole('heading', { level: 2, name: 'Velg en mal', exact: true }),
  ).toBeVisible();
  await sections(page)
    .getByRole('button', { name: 'Stilling og arbeidsplass', exact: true })
    .click();
  await expect(page.getByRole('textbox', { name: /^Stilling/ })).toHaveValue('Kassemedarbeider');
});

test('each section links to its help, and the form is still there when coming back', async ({
  page,
}) => {
  await logIn(page, '/configure');
  await chooseInterviewer(page);
  await fillStilling(page);

  await page.getByRole('link', { name: 'Les hjelpen for denne delen', exact: true }).click();

  await expect(page).toHaveURL(/\/help#intervjuer$/);
  await expect(
    page.getByRole('heading', { level: 3, name: 'Intervjuer', exact: true }),
  ).toBeInViewport();

  await page.goBack();
  await expect(
    page.getByRole('heading', { level: 2, name: 'Velg en mal', exact: true }),
  ).toBeVisible();
  await expect(
    sections(page).getByRole('button', { name: 'Stilling og arbeidsplass' }),
  ).toBeVisible();
});
