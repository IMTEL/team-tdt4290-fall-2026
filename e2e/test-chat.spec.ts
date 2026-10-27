import { test, expect, type Page } from '@playwright/test';

import { logIn } from './support/auth';
import { createAgent } from './support/data';

const conversation = (page: Page) => page.getByRole('log', { name: 'Samtale', exact: true });
const messageBox = (page: Page) => page.getByRole('textbox', { name: 'Melding', exact: true });

test('without an agent, the page points to the agent list', async ({ page }) => {
  await logIn(page, '/test-chat');

  await page.getByRole('link', { name: 'agentene dine', exact: true }).click();

  await expect(page).toHaveURL(/\/browse-agents$/);
});

test('an agent that does not exist cannot be tested', async ({ page }) => {
  await logIn(page, '/test-chat?agent=000000000000000000000000');

  await expect(page.getByText('Fant ikke intervjueren. Den kan være slettet.')).toBeVisible();
  await expect(messageBox(page)).toBeHidden();
});

test('the interviewer greets first and answers each message', async ({ page }) => {
  await logIn(page);
  const id = await createAgent(page, 'Intervjuer for butikk');
  await page.goto(`/test-chat?agent=${id}`);

  await expect(conversation(page)).toContainText(
    'Hei, og velkommen til intervjuet. Kan du starte med å fortelle litt om deg selv?',
  );
  // Nothing to send yet.
  await expect(page.getByRole('button', { name: 'Send', exact: true })).toBeDisabled();

  // Enter sends, and empties the box.
  await messageBox(page).fill('Jeg heter Ola.');
  await messageBox(page).press('Enter');
  await expect(conversation(page)).toContainText('Mock-svar: Jeg heter Ola.');
  await expect(messageBox(page)).toHaveValue('');

  // Shift+Enter adds a line instead of sending.
  await messageBox(page).fill('Første linje');
  await messageBox(page).press('Shift+Enter');
  await messageBox(page).pressSequentially('andre linje');
  await expect(messageBox(page)).toHaveValue('Første linje\nandre linje');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(conversation(page)).toContainText('Mock-svar: Første linje\nandre linje');
});

test('starting over clears the conversation', async ({ page }) => {
  await logIn(page);
  const id = await createAgent(page, 'Intervjuer for butikk');
  await page.goto(`/test-chat?agent=${id}`);
  await messageBox(page).fill('Jeg heter Ola.');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(conversation(page)).toContainText('Mock-svar: Jeg heter Ola.');

  await page.getByRole('button', { name: 'Start på nytt', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Start på nytt', exact: true })
    .click();

  await expect(conversation(page)).toContainText('Hei, og velkommen til intervjuet.');
  await expect(conversation(page)).not.toContainText('Jeg heter Ola.');
});
