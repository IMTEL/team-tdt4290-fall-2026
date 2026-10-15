import { expect, type Page } from '@playwright/test';

/** A regular expression that matches names starting with `text`, taken literally. */
const startsWith = (text: string) => new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);

// The steps on /configure before the chat: the agent type, then a profile and an interviewer
// template, then an industry template. The page must be logged in and on /configure.

/** Picks the interviewer, the only agent type that can be set up so far. */
export async function chooseInterviewer(page: Page): Promise<void> {
  await page.getByRole('button', { name: /^Intervjuer/ }).click();
  await expect(page.getByText('Agenttype: Intervjuer')).toBeVisible();
}

/**
 * Goes through the steps to the chat as an interviewer. `template` and `industry` are the titles
 * of the cards to pick, or null to go on without one. Choose a profile before calling this, on
 * the template step (see chooseProfile).
 */
export async function startInterviewerChat(
  page: Page,
  { template = null, industry = null }: { template?: string | null; industry?: string | null } = {},
): Promise<void> {
  if (!(await page.getByText('Agenttype: Intervjuer').isVisible())) {
    await chooseInterviewer(page);
  }
  if (template) {
    await page.getByRole('button', { name: startsWith(template) }).click();
  } else {
    await page.getByRole('button', { name: 'Fortsett uten mal', exact: true }).click();
  }
  if (industry) {
    await page.getByRole('button', { name: startsWith(industry) }).click();
  } else {
    await page.getByRole('button', { name: 'Fortsett uten bransjemal', exact: true }).click();
  }
  await expect(page.getByRole('log', { name: 'Samtale', exact: true })).toBeVisible();
}

/** Picks a job seeker profile on the template step. `label` is the start of its option. */
export async function chooseProfile(page: Page, label: string): Promise<void> {
  await page.getByRole('combobox', { name: 'Jobbsøkerprofil', exact: true }).click();
  await page.getByRole('option', { name: startsWith(label) }).click();
}

/** Sends a message in the chat on the page. */
export async function sendMessage(page: Page, text: string): Promise<void> {
  await page.getByRole('textbox', { name: 'Melding', exact: true }).fill(text);
  await page.getByRole('button', { name: 'Send', exact: true }).click();
}
