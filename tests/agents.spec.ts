import { test, expect } from '@playwright/test';

import { logIn } from './support/auth';

const configuration = {
  stilling: 'Butikkmedarbeider',
  bransje: 'Varehandel',
  bedrift: 'En matbutikk',
  intervjutype: 'Førstegangsintervju',
  intervjuer: 'Vennlig butikksjef',
  jobbsoker: 'Har lite arbeidserfaring',
  vanskelighetsgrad: 'lett',
  egneSporsmal: 'Ingen',
};

test('a new user has no agents', async ({ page }) => {
  await logIn(page, '/browse-agents');

  await expect(page.getByText('Du har ingen agenter ennå.')).toBeVisible();
});

test('a saved agent is listed and can be tested in a chat', async ({ page }) => {
  await logIn(page);
  // Save through our own API, as the configurator form does. The page shares the login cookie.
  const saved = await page.request.post('/api/agents', {
    data: { name: 'Intervjuer for butikk', configuration },
  });
  expect(saved.status()).toBe(201);

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
