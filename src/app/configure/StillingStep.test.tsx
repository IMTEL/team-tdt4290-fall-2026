import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { WizardFrame } from './StillingStep';

describe('WizardFrame', () => {
  it.each([
    [0, '/help#stilling'],
    [2, '/help#jobbsoker'],
    [4, '/help#fullfore'],
    // A section the help has no part for, e.g. from an old draft, gets the help for the whole form.
    [5, '/help#lag-en-agent'],
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
