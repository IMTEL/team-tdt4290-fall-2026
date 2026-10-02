import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import Home from './page';

describe('/', () => {
  it('renders the heading and the introduction', () => {
    render(<Home />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Konfigurator for intervjuagenter' }),
    ).toBeVisible();
    expect(
      screen.getByText(
        'Sett opp AI-intervjuere, test dem i en chat og publiser dem til VR-appen The Candidate.',
      ),
    ).toBeVisible();
  });

  it('has exactly one top-level heading', () => {
    render(<Home />);

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });
});
