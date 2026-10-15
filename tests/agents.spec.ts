import { test, expect, type Page } from '@playwright/test';

import { logIn } from './support/auth';
import { createAgent } from './support/data';

// MUI adds " *" to the label of a required field, so match the start of the label.
const field = (page: Page, label: string) =>
  page.getByRole('textbox', { name: new RegExp(`^${label}`) });

test('a new user has no agents', async ({ page }) => {
  await logIn(page, '/browse-agents');

  await expect(page.getByText('Du har ingen agenter ennå.')).toBeVisible();
  await page.getByRole('link', { name: 'Sett opp en intervjuer' }).click();
  await expect(page).toHaveURL(/\/configure$/);
});

test('a saved agent is listed under its type, with a summary', async ({ page }) => {
  await logIn(page);
  await createAgent(page, 'Intervjuer for butikk');

  await page.goto('/browse-agents');

  await expect(page.getByRole('heading', { level: 2, name: 'Intervjuer' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Intervjuer for butikk' })).toBeVisible();
  await expect(page.getByText('Butikkmedarbeider · Lett')).toBeVisible();
});

test('a saved agent is listed and can be tested in a chat', async ({ page }) => {
  await logIn(page);
  await createAgent(page, 'Intervjuer for butikk');

  await page.goto('/browse-agents');
  await expect(page.getByRole('heading', { name: 'Intervjuer for butikk' })).toBeVisible();

  await page.getByRole('link', { name: 'Test agenten' }).click();
  await page.getByRole('textbox', { name: 'Melding' }).fill('Jeg heter Ola.');
  await page.getByRole('button', { name: 'Send' }).click();

  // The mock answers with a fixed prefix and the last message, so no LLM is involved.
  await expect(page.getByRole('log', { name: 'Samtale' })).toContainText(
    'Mock-svar: Jeg heter Ola.',
  );
});

test('the agent page shows the configuration and the system prompt', async ({ page }) => {
  await logIn(page);
  await createAgent(page, 'Intervjuer for butikk');
  await page.goto('/browse-agents');

  await page.getByRole('link', { name: /Intervjuer for butikk/ }).click();

  await expect(
    page.getByRole('heading', { level: 1, name: 'Intervjuer for butikk' }),
  ).toBeVisible();
  await expect(page.getByRole('definition').filter({ hasText: 'Butikkmedarbeider' })).toBeVisible();
  await expect(page.getByRole('definition').filter({ hasText: 'En matbutikk' })).toBeVisible();

  // The system prompt is closed until the counsellor opens it.
  const prompt = page.getByRole('button', { name: 'Systemprompt' });
  await expect(prompt).toHaveAttribute('aria-expanded', 'false');
  await prompt.click();
  await expect(prompt).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('region')).toContainText('Butikkmedarbeider');
});

test('an agent that does not exist shows the not found page', async ({ page }) => {
  await logIn(page, '/browse-agents/000000000000000000000000');

  await expect(page.getByText('This page could not be found.')).toBeVisible();
});

test('an agent can be edited', async ({ page }) => {
  await logIn(page);
  const id = await createAgent(page, 'Intervjuer for butikk');
  await page.goto(`/browse-agents/${id}`);

  await page.getByRole('link', { name: 'Rediger' }).click();
  await expect(page.getByRole('heading', { name: 'Rediger agent' })).toBeVisible();
  await expect(field(page, 'Navn')).toHaveValue('Intervjuer for butikk');
  await expect(field(page, 'Stilling')).toHaveValue('Butikkmedarbeider');

  // Nothing to save before something is changed.
  const save = page.getByRole('button', { name: 'Lagre endringer' });
  await expect(save).toBeDisabled();
  await expect(page.getByText('Ingen endringer ennå')).toBeVisible();

  await field(page, 'Navn').fill('Krevende butikkintervju');
  await field(page, 'Vanskelighetsgrad').fill('vanskelig');
  await expect(page.getByText('2 endringer som ikke er lagret')).toBeVisible();

  // An empty field can't be saved.
  await field(page, 'Bransje').fill('');
  await expect(save).toBeDisabled();
  await field(page, 'Bransje').fill('Varehandel');

  await save.click();

  await expect(page).toHaveURL(new RegExp(`/browse-agents/${id}$`));
  await expect(
    page.getByRole('heading', { level: 1, name: 'Krevende butikkintervju' }),
  ).toBeVisible();
  await expect(page.getByRole('definition').filter({ hasText: 'vanskelig' })).toBeVisible();
});

test('an edit can fill in the interviewer from a template', async ({ page }) => {
  await logIn(page);
  const id = await createAgent(page, 'Intervjuer for butikk');
  await page.goto(`/browse-agents/${id}/edit`);

  await page.getByRole('combobox', { name: 'Intervjuermal' }).click();
  await page.getByRole('option', { name: 'Daglig leder' }).click();

  await expect(field(page, 'Intervjuer')).toHaveValue(/^Intervjueren er daglig leder/);
  await page.getByRole('button', { name: 'Lagre endringer' }).click();

  await expect(page).toHaveURL(new RegExp(`/browse-agents/${id}$`));
  await expect(
    page.getByRole('definition').filter({ hasText: /^Intervjueren er daglig leder/ }),
  ).toBeVisible();

  // The edit form remembers which template the text came from.
  await page.getByRole('link', { name: 'Rediger' }).click();
  await expect(page.getByRole('combobox', { name: 'Intervjuermal' })).toHaveText('Daglig leder');
});

test('cancelling an edit changes nothing', async ({ page }) => {
  await logIn(page);
  const id = await createAgent(page, 'Intervjuer for butikk');
  await page.goto(`/browse-agents/${id}/edit`);

  await field(page, 'Navn').fill('Et annet navn');
  await page.getByRole('link', { name: 'Avbryt' }).click();

  await expect(page).toHaveURL(new RegExp(`/browse-agents/${id}$`));
  await expect(
    page.getByRole('heading', { level: 1, name: 'Intervjuer for butikk' }),
  ).toBeVisible();
});

test('an agent can be cloned, and the original stays as it was', async ({ page }) => {
  await logIn(page);
  const id = await createAgent(page, 'Intervjuer for butikk');
  await page.goto(`/browse-agents/${id}`);

  await page.getByRole('link', { name: 'Klon' }).click();
  await expect(page.getByRole('heading', { name: 'Klon agent' })).toBeVisible();
  await expect(field(page, 'Navn')).toHaveValue('Intervjuer for butikk (kopi)');
  await field(page, 'Stilling').fill('Kassemedarbeider');

  await page.getByRole('button', { name: 'Lagre som ny agent' }).click();

  await expect(
    page.getByRole('heading', { level: 1, name: 'Intervjuer for butikk (kopi)' }),
  ).toBeVisible();
  await expect(page).not.toHaveURL(new RegExp(`/browse-agents/${id}$`));
  await expect(page.getByRole('definition').filter({ hasText: 'Kassemedarbeider' })).toBeVisible();

  await page.goto(`/browse-agents/${id}`);
  await expect(page.getByRole('definition').filter({ hasText: 'Butikkmedarbeider' })).toBeVisible();

  await page.goto('/browse-agents');
  await expect(page.getByRole('heading', { level: 3 })).toHaveText([
    'Intervjuer for butikk (kopi)',
    'Intervjuer for butikk',
  ]);
});

test('an agent can be deleted after confirming', async ({ page }) => {
  await logIn(page);
  const id = await createAgent(page, 'Intervjuer for butikk');
  await page.goto(`/browse-agents/${id}`);

  // Cancelling keeps the agent.
  await page.getByRole('button', { name: 'Slett' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Slette «Intervjuer for butikk»?');
  await dialog.getByRole('button', { name: 'Avbryt' }).click();
  await expect(dialog).toBeHidden();

  await page.getByRole('button', { name: 'Slett' }).click();
  await dialog.getByRole('button', { name: 'Slett' }).click();

  await expect(page).toHaveURL(/\/browse-agents$/);
  await expect(page.getByText('Du har ingen agenter ennå.')).toBeVisible();
});
