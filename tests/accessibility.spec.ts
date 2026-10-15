import { test, expect, type Page } from '@playwright/test';

import { expectNoAccessibilityViolations } from './support/accessibility';
import { logIn } from './support/auth';
import { configurationBlock, createAgent, createProfile, createTemplate } from './support/data';

// Every page, and the states a user can open on it (dialogs, menus, errors, chat), checked with
// axe in the light and the dark theme, since the colours and so the contrast differ.
// Only in Chromium: axe checks the page, not the browser, so the other browsers find the same.
test.skip(({ browserName }) => browserName !== 'chromium', 'axe gives the same result everywhere');

const NO_AGENT = '000000000000000000000000';

async function sendMessage(page: Page, text: string) {
  await page.getByRole('textbox', { name: 'Melding', exact: true }).fill(text);
  await page.getByRole('button', { name: 'Send', exact: true }).click();
}

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} theme`, () => {
    // The theme follows the system unless the user picks one, so this sets it.
    test.use({ colorScheme });

    test.describe('signed out', () => {
      test('start page', async ({ page }) => {
        await page.goto('/');
        await expect(page.getByRole('link', { name: 'Logg inn', exact: true })).toBeVisible();
        await expectNoAccessibilityViolations(page);
      });

      test('login page with an error', async ({ page }) => {
        await page.goto('/login?error=OAuthCallback');
        await expect(page.getByText('Innloggingen mislyktes. Prøv igjen.')).toBeVisible();
        await expectNoAccessibilityViolations(page);
      });

      test('theme menu', async ({ page }) => {
        await page.goto('/');
        await page.getByRole('button', { name: 'Bytt tema', exact: true }).click();
        await expect(page.getByRole('menuitem', { name: 'Mørk', exact: true })).toBeVisible();
        await expectNoAccessibilityViolations(page);
      });
    });

    test.describe('agents', () => {
      test('empty agent list', async ({ page }) => {
        await logIn(page, '/browse-agents');
        await expect(page.getByText('Du har ingen agenter ennå.')).toBeVisible();
        await expectNoAccessibilityViolations(page);
      });

      test('agent list', async ({ page }) => {
        await logIn(page);
        await createAgent(page, 'Intervjuer for butikk');
        await page.goto('/browse-agents');
        await expect(
          page.getByRole('heading', { name: 'Intervjuer for butikk', exact: true }),
        ).toBeVisible();
        await expectNoAccessibilityViolations(page);
      });

      test('agent page with the system prompt open', async ({ page }) => {
        await logIn(page);
        const id = await createAgent(page, 'Intervjuer for butikk');
        await page.goto(`/browse-agents/${id}`);
        await page.getByRole('button', { name: 'Systemprompt', exact: true }).click();
        await expect(page.getByRole('region')).toBeVisible();
        await expectNoAccessibilityViolations(page);
      });

      test('delete agent dialog', async ({ page }) => {
        await logIn(page);
        const id = await createAgent(page, 'Intervjuer for butikk');
        await page.goto(`/browse-agents/${id}`);
        await page.getByRole('button', { name: 'Slett', exact: true }).click();
        await expect(page.getByRole('dialog')).toBeVisible();
        await expectNoAccessibilityViolations(page);
      });

      test('edit form with a change', async ({ page }) => {
        await logIn(page);
        const id = await createAgent(page, 'Intervjuer for butikk');
        await page.goto(`/browse-agents/${id}/edit`);
        await page.getByRole('textbox', { name: /^Vanskelighetsgrad/ }).fill('vanskelig');
        await expect(page.getByText('1 endring som ikke er lagret')).toBeVisible();
        await expectNoAccessibilityViolations(page);
      });

      test('edit form with the template list open', async ({ page }) => {
        await logIn(page);
        const id = await createAgent(page, 'Intervjuer for butikk');
        await page.goto(`/browse-agents/${id}/edit`);
        await page.getByRole('combobox', { name: 'Intervjuermal', exact: true }).click();
        await expect(page.getByRole('listbox')).toBeVisible();
        await expectNoAccessibilityViolations(page);
      });

      test('clone form', async ({ page }) => {
        await logIn(page);
        const id = await createAgent(page, 'Intervjuer for butikk');
        await page.goto(`/browse-agents/${id}/clone`);
        await expect(page.getByRole('heading', { name: 'Klon agent', exact: true })).toBeVisible();
        await expectNoAccessibilityViolations(page);
      });

      test('agent not found', async ({ page }) => {
        await logIn(page, `/browse-agents/${NO_AGENT}`);
        await expect(page.getByText('This page could not be found.')).toBeVisible();
        await expectNoAccessibilityViolations(page);
      });
    });

    test.describe('configure', () => {
      test('template picker with saved templates', async ({ page }) => {
        await logIn(page);
        await createTemplate(page, { title: 'Butikksjef' });
        await page.goto('/configure');
        await expect(
          page.getByRole('heading', { level: 3, name: 'Butikksjef', exact: true }),
        ).toBeVisible();
        await expectNoAccessibilityViolations(page);
      });

      test('profile list open', async ({ page }) => {
        await logIn(page);
        await createProfile(page, { label: 'Profil A', ageRange: '18-24' });
        await page.goto('/configure');
        await page.getByRole('combobox', { name: 'Jobbsøkerprofil', exact: true }).click();
        await expect(page.getByRole('listbox')).toBeVisible();
        await expectNoAccessibilityViolations(page);
      });

      test('chat with a finished configuration', async ({ page }) => {
        await logIn(page, '/configure');
        await page.getByRole('button', { name: 'Fortsett uten mal', exact: true }).click();
        await sendMessage(page, configurationBlock());
        await expect(
          page.getByRole('form', { name: 'Lagre intervjueren', exact: true }),
        ).toBeVisible();
        await expectNoAccessibilityViolations(page);
      });

      test('saved agent message', async ({ page }) => {
        await logIn(page, '/configure');
        await page.getByRole('button', { name: 'Fortsett uten mal', exact: true }).click();
        await sendMessage(page, configurationBlock());
        await page.getByRole('button', { name: 'Lagre agent', exact: true }).click();
        await expect(page.getByText(/er lagret\./)).toBeVisible();
        await expectNoAccessibilityViolations(page);
      });
    });

    test.describe('templates', () => {
      test('new template form with an error', async ({ page }) => {
        await logIn(page, '/create-template');
        await page
          .getByRole('textbox', { name: 'Fokusområder', exact: true })
          .fill('a, b, c, d, e, f, g');
        await expect(page.getByText('Skriv høyst 6 fokusområder.')).toBeVisible();
        await expectNoAccessibilityViolations(page);
      });

      test('edit template form', async ({ page }) => {
        await logIn(page);
        const id = await createTemplate(page, { title: 'Butikksjef' });
        await page.goto(`/templates/${id}/edit`);
        await expect(page.getByRole('textbox', { name: /^Navn på malen/ })).toHaveValue(
          'Butikksjef',
        );
        await expectNoAccessibilityViolations(page);
      });

      test('delete template dialog', async ({ page }) => {
        await logIn(page);
        await createTemplate(page, { title: 'Butikksjef' });
        await page.goto('/configure');
        await page.getByRole('button', { name: 'Slett Butikksjef', exact: true }).click();
        await expect(page.getByRole('dialog')).toBeVisible();
        await expectNoAccessibilityViolations(page);
      });
    });

    test.describe('profiles', () => {
      test('empty profile list', async ({ page }) => {
        await logIn(page, '/profiles');
        await expect(page.getByText('Du har ingen profiler ennå.')).toBeVisible();
        await expectNoAccessibilityViolations(page);
      });

      test('profile list', async ({ page }) => {
        await logIn(page);
        await createProfile(page, { label: 'Profil A', ageRange: '25-29' });
        await page.goto('/profiles');
        await expect(page.getByRole('heading', { name: 'Profil A', exact: true })).toBeVisible();
        await expectNoAccessibilityViolations(page);
      });

      test('new profile form with an error', async ({ page }) => {
        await logIn(page, '/profiles/new');
        const tooMany = Array.from({ length: 21 }, (_, i) => `Språk ${i + 1}`).join(', ');
        await page.getByRole('textbox', { name: 'Språk', exact: true }).fill(tooMany);
        await expect(page.getByText('Skriv høyst 20 språk.')).toBeVisible();
        await expectNoAccessibilityViolations(page);
      });

      test('edit profile form', async ({ page }) => {
        await logIn(page);
        const id = await createProfile(page, { label: 'Profil A' });
        await page.goto(`/profiles/${id}/edit`);
        await expect(page.getByRole('textbox', { name: /^Navn på profilen/ })).toHaveValue(
          'Profil A',
        );
        await expectNoAccessibilityViolations(page);
      });

      test('delete profile dialog', async ({ page }) => {
        await logIn(page);
        await createProfile(page, { label: 'Profil A' });
        await page.goto('/profiles');
        await page.getByRole('button', { name: 'Slett Profil A', exact: true }).click();
        await expect(page.getByRole('dialog')).toBeVisible();
        await expectNoAccessibilityViolations(page);
      });
    });

    test.describe('test chat', () => {
      test('without an agent', async ({ page }) => {
        await logIn(page, '/test-chat');
        await expect(page.getByRole('link', { name: 'agentene dine', exact: true })).toBeVisible();
        await expectNoAccessibilityViolations(page);
      });

      test('agent not found', async ({ page }) => {
        await logIn(page, `/test-chat?agent=${NO_AGENT}`);
        await expect(page.getByText(/Fant ikke intervjueren/)).toBeVisible();
        await expectNoAccessibilityViolations(page);
      });

      test('conversation', async ({ page }) => {
        await logIn(page);
        const id = await createAgent(page, 'Intervjuer for butikk');
        await page.goto(`/test-chat?agent=${id}`);
        await sendMessage(page, 'Jeg heter Ola.');
        await expect(page.getByRole('log')).toContainText('Mock-svar: Jeg heter Ola.');
        await expectNoAccessibilityViolations(page);
      });
    });
  });
}
