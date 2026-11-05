import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { WizardFrame } from './StillingStep';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe('WizardFrame', () => {
  it.each([
    [0, '/help#stilling'],
    [2, '/help#jobbsoker'],
    [4, '/help#ai-innstillinger'],
    [5, '/help#fullfore'],
    // A section the help has no part for, e.g. from an old draft, gets the help for the whole form.
    [6, '/help#lag-en-agent'],
  ])('section %i links to its own part of the help page', (current, href) => {
    render(
      <WizardFrame current={current}>
        <p>Skjema</p>
      </WizardFrame>,
    );

    expect(screen.getByRole('link', { name: 'Les hjelpen for denne delen' })).toHaveAttribute(
      'href',
      href,
    );
  });
});
