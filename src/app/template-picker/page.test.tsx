import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import TemplatePickerPage, { metadata } from './page';

describe('/template-picker', () => {
  it('shows the templates and a link back to the chat', () => {
    render(<TemplatePickerPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Sett opp en intervjuer' })).toBeVisible();
    expect(screen.getByRole('heading', { level: 2, name: 'Velg en mal' })).toBeVisible();
    expect(screen.getByRole('link', { name: /Tilbake til samtalen/ })).toHaveAttribute(
      'href',
      '/configure',
    );
  });

  it('shows the chosen template, and lets the user choose again', async () => {
    const user = userEvent.setup();
    render(<TemplatePickerPage />);

    await user.click(screen.getByRole('button', { name: /Teamleder/ }));

    expect(screen.getByText('Du har valgt malen «Teamleder».')).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Velg en mal' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Velg en annen mal' }));

    expect(screen.getByRole('heading', { level: 2, name: 'Velg en mal' })).toBeVisible();
  });

  it('can start without a template', async () => {
    const user = userEvent.setup();
    render(<TemplatePickerPage />);

    await user.click(screen.getByRole('button', { name: 'Start uten mal' }));

    expect(screen.getByText('Du starter uten mal.')).toBeVisible();
  });

  it('sets a Norwegian tab title', () => {
    expect(metadata.title).toBe('Velg mal');
  });
});
