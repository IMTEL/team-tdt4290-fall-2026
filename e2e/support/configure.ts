import { expect, type Page } from '@playwright/test';

/** A regular expression that matches names starting with `text`, taken literally. */
const startsWith = (text: string) => new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);

// The interviewer wizard on /configure: stilling og arbeidsplass, intervjuer, jobbsøker,
// innstillinger, then fullføre, where the agent is published. The page must be logged in.

/** The wizard's Intervjuer step, opened straight from a link. Saved templates are shown there. */
export const INTERVIEWER_STEP = '/configure?type=interviewer&step=intervjuer';

/** Picks the interviewer on /configure, the only agent type that can be set up so far. */
export async function chooseInterviewer(page: Page): Promise<void> {
  await page.getByRole('button', { name: /^Intervjuer/ }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Ny intervjuagent', exact: true }),
  ).toBeVisible();
}

/**
 * Fills in the stilling step and goes on to the interviewer. The job template and industry are
 * button names, so they must be among the first ones shown.
 */
export async function fillStilling(
  page: Page,
  {
    jobTitle = 'Butikkmedarbeider',
    jobTemplate = 'Butikkmedarbeider',
    industry = 'Varehandel',
    employer = 'Privat',
  }: { jobTitle?: string; jobTemplate?: string; industry?: string; employer?: string } = {},
): Promise<void> {
  await page.getByRole('textbox', { name: /^Stilling/ }).fill(jobTitle);
  await page
    .getByRole('group', { name: 'Stillingsmaler', exact: true })
    .getByRole('button', { name: jobTemplate, exact: true })
    .click();
  await page
    .getByRole('group', { name: 'Bransje', exact: true })
    .getByRole('button', { name: industry, exact: true })
    .click();
  await page
    .getByRole('group', { name: 'Arbeidsgiver', exact: true })
    .getByRole('button', { name: employer, exact: true })
    .click();
  await page.getByRole('button', { name: 'Neste', exact: true }).click();
}

/** On the interviewer or job seeker step: picks the card that starts with `title`, or none. */
export async function pickTemplate(page: Page, title: string | null): Promise<void> {
  if (title) {
    await page.getByRole('radio', { name: startsWith(title) }).click();
  } else {
    await page.getByRole('button', { name: 'Fortsett uten mal', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Neste', exact: true }).click();
}

/** Fills in the required settings, with the easiest choices, and goes on to the last step. */
export async function fillSettings(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Første intervju', exact: true }).click();
  await page.getByRole('button', { name: 'Lett', exact: true }).click();
  await page.getByRole('button', { name: '5–6', exact: true }).click();
  await page.getByRole('button', { name: 'Ja', exact: true }).click();
  await page.getByRole('button', { name: 'Neste', exact: true }).click();
}

/**
 * Goes from /configure through every step to the last one, Fullføre. `interviewer` and
 * `jobSeeker` are the cards to pick, or null to go on without one.
 */
export async function goToFinish(
  page: Page,
  {
    interviewer = null,
    jobSeeker = null,
  }: { interviewer?: string | null; jobSeeker?: string | null } = {},
): Promise<void> {
  await chooseInterviewer(page);
  await fillStilling(page);
  await pickTemplate(page, interviewer);
  await pickTemplate(page, jobSeeker);
  await fillSettings(page);
  await expect(
    page.getByRole('heading', { level: 2, name: 'Fullføre', exact: true }),
  ).toBeVisible();
}

/** Sends a message in the chat on the page. */
export async function sendMessage(page: Page, text: string): Promise<void> {
  await page.getByRole('textbox', { name: 'Melding', exact: true }).fill(text);
  await page.getByRole('button', { name: 'Send', exact: true }).click();
}
