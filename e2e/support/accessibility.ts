import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

// The WCAG levels we aim for: A and AA, up to WCAG 2.2. Universell utforming requires WCAG 2.1 AA.
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/**
 * Runs axe on the page as it is now and fails with one line per problem: the rule, what is wrong
 * and the elements it found. Open menus and dialogs first to check them too. axe finds about a
 * third of all accessibility problems; the rest needs a keyboard and a screen reader.
 */
export async function expectNoAccessibilityViolations(page: Page): Promise<void> {
  // Dialogs, menus and buttons fade in. Mid-fade, axe measures half-blended colours and reports
  // contrast problems that are not there, so wait until nothing is moving.
  await page.waitForFunction(() =>
    document.getAnimations().every((animation) => animation.playState !== 'running'),
  );

  const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

  const problems = violations.map(({ id, impact, help, helpUrl, nodes }) => {
    const elements = nodes.map(
      // The summary says why, for example the contrast ratio and the two colours.
      (node) => `  ${node.target.join(' ')}\n    ${node.failureSummary?.replace(/\n\s*/g, ' ')}`,
    );
    return `${id} (${impact}): ${help}\n  ${helpUrl}\n${elements.join('\n')}`;
  });
  expect(problems, 'axe found accessibility problems').toEqual([]);
}
