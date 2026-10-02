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

  it('links to the template picker', () => {
    render(<ConfigurePage />);

    expect(screen.getByRole('link', { name: 'Velg en mal' })).toHaveAttribute(
      'href',
      '/template-picker',
    );
  });

  it('sets a Norwegian tab title', () => {
    expect(metadata.title).toBe('Konfigurer intervjuer');
  });
});
