import { test, expect } from '@playwright/test';

import { logIn } from './support/auth';

test('start page shows the heading without logging in', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', { level: 1, name: 'Lag AI-intervjuere for jobbsøkere', exact: true }),
  ).toBeVisible();
});

test('the navbar links to every page and marks the one that is open', async ({ page }) => {
  await logIn(page);
  const nav = page.getByRole('navigation');

  const pages = [
    { link: 'Agenter', url: /\/browse-agents$/, heading: 'Agenter' },
    { link: 'Maler', url: /\/templates$/, heading: 'Maler' },
    { link: 'Hjem', url: /\/$/, heading: 'Lag AI-intervjuere for jobbsøkere' },
  ];
  for (const { link, url, heading } of pages) {
    await nav.getByRole('link', { name: link, exact: true }).click();

    await expect(page).toHaveURL(url);
    await expect(page.getByRole('heading', { level: 1, name: heading, exact: true })).toBeVisible();
    await expect(nav.getByRole('link', { name: link, exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    );
  }
});

test('the theme can be changed and is remembered', async ({ page }) => {
  await page.goto('/');
  const html = page.locator('html');

  await page.getByRole('button', { name: 'Bytt tema', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Mørk', exact: true }).click();
  await expect(html).toHaveClass(/\bdark\b/);

  await page.reload();
  await expect(html).toHaveClass(/\bdark\b/);

  await page.getByRole('button', { name: 'Bytt tema', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Lys', exact: true }).click();
  await expect(html).toHaveClass(/\blight\b/);
});
