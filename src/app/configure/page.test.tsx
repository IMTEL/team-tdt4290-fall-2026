import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import ConfigurePage, { metadata } from './page';

describe('/configure', () => {
  it('renders the heading and the template picker first', () => {
    render(<ConfigurePage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Sett opp en intervjuer' })).toBeVisible();
    expect(screen.getByRole('heading', { level: 2, name: 'Velg en mal' })).toBeVisible();
    expect(screen.queryByRole('textbox', { name: 'Melding' })).not.toBeInTheDocument();
  });

  it('shows the chat after choosing a template, and goes back with "Bytt mal"', async () => {
    const user = userEvent.setup();
    render(<ConfigurePage />);

    await user.click(screen.getByRole('button', { name: /Daglig leder/ }));

    expect(screen.getByText('Mal: Daglig leder')).toBeVisible();
    expect(screen.getByRole('log', { name: 'Samtale' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Melding' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Bytt mal' }));

    expect(screen.getByRole('heading', { level: 2, name: 'Velg en mal' })).toBeVisible();
  });

  it('can start without a template', async () => {
    const user = userEvent.setup();
    render(<ConfigurePage />);

    await user.click(screen.getByRole('button', { name: 'Start uten mal' }));

    expect(screen.getByText('Uten mal')).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Melding' })).toBeInTheDocument();
  });

  it('sets a Norwegian tab title', () => {
    expect(metadata.title).toBe('Konfigurer intervjuer');
  });
});
