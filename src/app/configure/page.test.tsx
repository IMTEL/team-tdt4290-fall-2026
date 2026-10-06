import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import ConfigurePage, { metadata } from './page';

describe('/configure', () => {
  it('starts with the template picker, not the chat', () => {
    render(<ConfigurePage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Sett opp en intervjuer' })).toBeVisible();
    expect(screen.getByRole('heading', { level: 2, name: 'Velg en mal' })).toBeVisible();
    expect(screen.queryByRole('log', { name: 'Samtale' })).not.toBeInTheDocument();
  });

  it('opens the chat for the chosen template, and lets the user change template', async () => {
    const user = userEvent.setup();
    render(<ConfigurePage />);

    await user.click(screen.getByRole('button', { name: /Teamleder/ }));

    expect(screen.getByRole('log', { name: 'Samtale' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Melding' })).toBeInTheDocument();
    expect(screen.getByText(/malen «Teamleder»/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Bytt mal' }));

    expect(screen.getByRole('heading', { level: 2, name: 'Velg en mal' })).toBeVisible();
  });

  it('sets a Norwegian tab title', () => {
    expect(metadata.title).toBe('Konfigurer intervjuer');
  });
});
