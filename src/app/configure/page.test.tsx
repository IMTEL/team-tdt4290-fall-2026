import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import ConfigurePage, { metadata } from './page';

describe('/configure', () => {
  it('renders the heading and the chat', () => {
    render(<ConfigurePage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Sett opp en intervjuer' })).toBeVisible();
    expect(screen.getByRole('log', { name: 'Samtale' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Melding' })).toBeInTheDocument();
  });

  it('sets a Norwegian tab title', () => {
    expect(metadata.title).toBe('Konfigurer intervjuer');
  });
});
