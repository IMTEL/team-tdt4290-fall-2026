import { test, expect, type Page } from '@playwright/test';

import { logIn } from './support/auth';
import { createAgent, publishAgent } from './support/data';

// MUI adds " *" to the label of a required field, so match the start of the label.
const field = (page: Page, label: string) =>
  page.getByRole('textbox', { name: new RegExp(`^${label}`) });

test('a new user has no agents, only the card for a new one', async ({ page }) => {
  await logIn(page, '/browse-agents');

  await expect(page.getByRole('heading', { level: 3 })).toHaveText(['Ny agent']);
  await page.getByRole('button', { name: /^Ny agent/ }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /^Intervjuer/ })
    .click();

  await expect(page).toHaveURL(/\/configure\?type=interviewer$/);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Ny intervjuagent', exact: true }),
  ).toBeVisible();
});

test('a saved agent is listed under its type, with its interviewer', async ({ page }) => {
  await logIn(page);
  await createAgent(page, 'Intervjuer for butikk');

  await page.goto('/browse-agents');

  await expect(
    page.getByRole('heading', { level: 2, name: 'Intervjuer', exact: true }),
  ).toBeVisible();
  const card = page.getByRole('link', { name: /^Intervjuer for butikk/ });
  await expect(card.getByRole('heading', { level: 3 })).toHaveText('Intervjuer for butikk');
  await expect(card).toContainText('Privat');
  await expect(card).toContainText('Vennlig butikksjef');
});

test('a saved agent is listed and can be tested in a chat', async ({ page }) => {
  await logIn(page);
  await createAgent(page, 'Intervjuer for butikk');

  await page.goto('/browse-agents');
  await expect(
    page.getByRole('heading', { name: 'Intervjuer for butikk', exact: true }),
  ).toBeVisible();

  await page.getByRole('link', { name: 'Test agenten', exact: true }).click();
  await page.getByRole('textbox', { name: 'Melding', exact: true }).fill('Jeg heter Ola.');
  await page.getByRole('button', { name: 'Send', exact: true }).click();

  // The mock answers with a fixed prefix and the last message, so no LLM is involved.
  await expect(page.getByRole('log', { name: 'Samtale', exact: true })).toContainText(
    'Mock-svar: Jeg heter Ola.',
  );
});

test('the agent page shows the configuration and the system prompt', async ({ page }) => {
  await logIn(page);
  await createAgent(page, 'Intervjuer for butikk');
  await page.goto('/browse-agents');

  await page.getByRole('link', { name: /Intervjuer for butikk/ }).click();

  await expect(
    page.getByRole('heading', { level: 1, name: 'Intervjuer for butikk', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('tabpanel').getByRole('definition').filter({ hasText: 'Butikkmedarbeider' }),
  ).toBeVisible();
  await expect(
    page.getByRole('tabpanel').getByRole('definition').filter({ hasText: 'En matbutikk' }),
  ).toBeVisible();
  await expect(page.getByRole('main')).toContainText(/Agenttype:\s*Intervjuer/);
  await expect(page.getByRole('region', { name: 'Oppsummering', exact: true })).toBeVisible();

  // The model, temperature and system prompt are in their own tabs.
  const advanced = page.getByRole('tab', { name: 'Avanserte innstillinger', exact: true });
  await expect(advanced).toHaveAttribute('aria-selected', 'false');
  await advanced.click();
  await expect(advanced).toHaveAttribute('aria-selected', 'true');
  await expect(
    page.getByRole('tabpanel').getByRole('definition').filter({ hasText: 'openai/gpt-oss-120b' }),
  ).toBeVisible();

  await page.getByRole('tab', { name: 'Systemprompt', exact: true }).click();
  await expect(page.getByRole('tabpanel', { name: 'Systemprompt', exact: true })).toContainText(
    'Butikkmedarbeider',
  );
});

test('the agent page says how the answers shape the interviewer', async ({ page }) => {
  await logIn(page);
  const id = await createAgent(page, 'Intervjuer for butikk', {
    vanskelighetsgrad: 'krevende | Antall spørsmål: 5–6 | Oppfølgingsspørsmål: nei',
  });
  await page.goto(`/browse-agents/${id}`);

  const summary = page.getByRole('region', { name: 'Oppsummering' });
  await expect(
    summary.getByRole('heading', { name: 'Slik former svarene dine agenten', exact: true }),
  ).toBeVisible();
  await expect(summary).toContainText('Mer utfordrende spørsmål');
  await expect(summary).toContainText('Ingen oppfølgingsspørsmål');
});

test('an agent that does not exist shows the not found page', async ({ page }) => {
  await logIn(page, '/browse-agents/000000000000000000000000');

  await expect(page.getByText('This page could not be found.')).toBeVisible();
});

test('an agent can be edited', async ({ page }) => {
  await logIn(page);
  const id = await createAgent(page, 'Intervjuer for butikk');
  await page.goto(`/browse-agents/${id}`);

  await page.getByRole('link', { name: 'Rediger', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Rediger agent', exact: true })).toBeVisible();
  await expect(field(page, 'Navn')).toHaveValue('Intervjuer for butikk');
  await expect(field(page, 'Stilling')).toHaveValue('Butikkmedarbeider');

  // Nothing to save before something is changed.
  const save = page.getByRole('button', { name: 'Lagre endringer', exact: true });
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
    page.getByRole('heading', { level: 1, name: 'Krevende butikkintervju', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('tabpanel').getByRole('definition').filter({ hasText: 'vanskelig' }),
  ).toBeVisible();
});

test('an edit can fill in the interviewer from a template', async ({ page }) => {
  await logIn(page);
  const id = await createAgent(page, 'Intervjuer for butikk');
  await page.goto(`/browse-agents/${id}/edit`);

  await page.getByRole('combobox', { name: 'Intervjuermal', exact: true }).click();
  await page.getByRole('option', { name: 'Daglig leder', exact: true }).click();

  await expect(field(page, 'Intervjuer')).toHaveValue(/^Intervjueren er daglig leder/);
  await page.getByRole('button', { name: 'Lagre endringer', exact: true }).click();

  await expect(page).toHaveURL(new RegExp(`/browse-agents/${id}$`));
  await expect(
    page
      .getByRole('tabpanel')
      .getByRole('definition')
      .filter({ hasText: /^Intervjueren er daglig leder/ }),
  ).toBeVisible();

  // The edit form remembers which template the text came from.
  await page.getByRole('link', { name: 'Rediger', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Intervjuermal', exact: true })).toHaveText(
    'Daglig leder',
  );
});

test('cancelling an edit changes nothing', async ({ page }) => {
  await logIn(page);
  const id = await createAgent(page, 'Intervjuer for butikk');
  await page.goto(`/browse-agents/${id}/edit`);

  await field(page, 'Navn').fill('Et annet navn');
  await page.getByRole('link', { name: 'Avbryt', exact: true }).click();

  await expect(page).toHaveURL(new RegExp(`/browse-agents/${id}$`));
  await expect(
    page.getByRole('heading', { level: 1, name: 'Intervjuer for butikk', exact: true }),
  ).toBeVisible();
});

test('an agent can be published to The Candidate and hidden again', async ({ page }) => {
  await logIn(page);
  const id = await createAgent(page, 'Intervjuer for butikk');
  await page.goto(`/browse-agents/${id}`);
  const chip = page.getByText('Publisert i The Candidate', { exact: true });
  await expect(chip).toBeHidden();

  await page.getByRole('button', { name: 'Publiser', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('textbox', { name: /^Navn i The Candidate/ })).toHaveValue(
    'Intervjuer for butikk',
  );
  await dialog.getByRole('textbox', { name: /^Navn i The Candidate/ }).fill('Butikkintervju');
  await dialog.getByRole('button', { name: 'Publiser', exact: true }).click();
  await expect(chip).toBeVisible();

  await page.getByRole('button', { name: 'Gjem agent', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Gjemme «Butikkintervju»?');
  await page.getByRole('dialog').getByRole('button', { name: 'Gjem agent', exact: true }).click();
  await expect(chip).toBeHidden();

  // The page still knows after loading the agent again.
  await page.reload();
  await expect(page.getByRole('button', { name: 'Publiser', exact: true })).toBeVisible();
  await expect(chip).toBeHidden();
});

test('editing a published agent hides it until it is published again', async ({ page }) => {
  await logIn(page);
  const id = await createAgent(page, 'Intervjuer for butikk');
  await publishAgent(page, id, 'Butikkintervju');
  await page.goto(`/browse-agents/${id}/edit`);

  await expect(page.getByText(/^Agenten er publisert i The Candidate\./)).toBeVisible();
  await field(page, 'Vanskelighetsgrad').fill('vanskelig');
  await page.getByRole('button', { name: 'Lagre endringer', exact: true }).click();

  await expect(page).toHaveURL(new RegExp(`/browse-agents/${id}$`));
  const notice = page.getByText(/^Agenten er gjemt fra The Candidate fordi den ble endret\./);
  const chip = page.getByText('Publisert i The Candidate', { exact: true });
  await expect(notice).toBeVisible();
  await expect(chip).toBeHidden();
  await expect(
    page.getByRole('tabpanel').getByRole('definition').filter({ hasText: 'vanskelig' }),
  ).toBeVisible();

  // Publishing again starts from the name and description it had.
  await page.getByRole('button', { name: 'Publiser', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('textbox', { name: /^Navn i The Candidate/ })).toHaveValue(
    'Butikkintervju',
  );
  await expect(dialog.getByRole('textbox', { name: /^Kort beskrivelse/ })).toHaveValue(
    'Øv på et intervju i en butikk.',
  );
  await dialog.getByRole('button', { name: 'Publiser', exact: true }).click();

  await expect(chip).toBeVisible();
  await expect(notice).toBeHidden();
});

test('editing an agent that is not published says nothing about The Candidate', async ({
  page,
}) => {
  await logIn(page);
  const id = await createAgent(page, 'Intervjuer for butikk');
  await page.goto(`/browse-agents/${id}/edit`);

  await expect(page.getByRole('heading', { name: 'Rediger agent', exact: true })).toBeVisible();
  await expect(page.getByText(/^Agenten er publisert i The Candidate\./)).toBeHidden();
  await field(page, 'Vanskelighetsgrad').fill('vanskelig');
  await page.getByRole('button', { name: 'Lagre endringer', exact: true }).click();

  await expect(
    page.getByRole('tabpanel').getByRole('definition').filter({ hasText: 'vanskelig' }),
  ).toBeVisible();
  await expect(page.getByText(/^Agenten er gjemt fra The Candidate/)).toBeHidden();
});

test('an agent can be cloned, and the original stays as it was', async ({ page }) => {
  await logIn(page);
  const id = await createAgent(page, 'Intervjuer for butikk');
  await page.goto(`/browse-agents/${id}`);

  await page.getByRole('link', { name: 'Klon', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Klon agent', exact: true })).toBeVisible();
  await expect(field(page, 'Navn')).toHaveValue('Intervjuer for butikk (kopi)');
  await field(page, 'Stilling').fill('Kassemedarbeider');

  await page.getByRole('button', { name: 'Lagre som ny agent', exact: true }).click();

  await expect(
    page.getByRole('heading', { level: 1, name: 'Intervjuer for butikk (kopi)', exact: true }),
  ).toBeVisible();
  await expect(page).not.toHaveURL(new RegExp(`/browse-agents/${id}$`));
  await expect(
    page.getByRole('tabpanel').getByRole('definition').filter({ hasText: 'Kassemedarbeider' }),
  ).toBeVisible();

  await page.goto(`/browse-agents/${id}`);
  await expect(
    page.getByRole('tabpanel').getByRole('definition').filter({ hasText: 'Butikkmedarbeider' }),
  ).toBeVisible();

  await page.goto('/browse-agents');
  await expect(page.getByRole('heading', { level: 3 })).toHaveText([
    'Ny agent',
    'Intervjuer for butikk (kopi)',
    'Intervjuer for butikk',
  ]);
});

test('an agent can be deleted after confirming', async ({ page }) => {
  await logIn(page);
  const id = await createAgent(page, 'Intervjuer for butikk');
  await page.goto(`/browse-agents/${id}`);

  // Cancelling keeps the agent.
  await page.getByRole('button', { name: 'Slett', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Slette «Intervjuer for butikk»?');
  await dialog.getByRole('button', { name: 'Avbryt', exact: true }).click();
  await expect(dialog).toBeHidden();

  await page.getByRole('button', { name: 'Slett', exact: true }).click();
  await dialog.getByRole('button', { name: 'Slett', exact: true }).click();

  await expect(page).toHaveURL(/\/browse-agents$/);
  await expect(page.getByRole('heading', { level: 3 })).toHaveText(['Ny agent']);
});
