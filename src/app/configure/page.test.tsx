import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ConfigurePage, { metadata } from './page';

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  // The page loads the counsellor's saved templates. By default they have none.
  fetchMock.mockResolvedValue(Response.json({ templates: [] }));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  fetchMock.mockReset();
});

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

  it('can continue without a template, and choose one afterwards', async () => {
    const user = userEvent.setup();
    render(<ConfigurePage />);

    await user.click(screen.getByRole('button', { name: 'Fortsett uten mal' }));

    expect(screen.getByRole('log', { name: 'Samtale' })).toBeInTheDocument();
    expect(screen.getByText('Ingen mal valgt')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Velg en mal' }));

    expect(screen.getByRole('heading', { level: 2, name: 'Velg en mal' })).toBeVisible();
  });

  it('shows the counsellor’s saved templates after the built-in ones', async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        templates: [
          {
            id: 'saved-1',
            title: 'Min butikksjef',
            description: 'Lagret av meg.',
            focus: ['Service'],
            persona: 'Intervjueren er butikksjef.',
          },
        ],
      }),
    );
    render(<ConfigurePage />);

    const saved = await screen.findByRole('button', { name: /^Min butikksjef/ });
    const cards = screen.getAllByRole('listitem');
    expect(cards.at(-1)).toContainElement(saved);
    expect(screen.getByRole('button', { name: /Teamleder/ })).toBeInTheDocument();
  });

  it('removes a saved template from the picker once it is deleted', async () => {
    const saved = {
      id: 'saved-1',
      title: 'Min butikksjef',
      description: 'Lagret av meg.',
      focus: [],
      persona: 'Intervjueren er butikksjef.',
    };
    fetchMock.mockImplementation(async (_url, init) =>
      init?.method === 'DELETE'
        ? new Response(null, { status: 204 })
        : Response.json({ templates: [saved] }),
    );
    const user = userEvent.setup();
    render(<ConfigurePage />);

    await user.click(await screen.findByRole('button', { name: 'Slett Min butikksjef' }));
    await user.click(screen.getByRole('button', { name: 'Slett' }));

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /^Min butikksjef/ })).not.toBeInTheDocument(),
    );
    expect(fetchMock).toHaveBeenCalledWith('/api/templates/saved-1', { method: 'DELETE' });
  });

  it('still shows the built-in templates when the saved ones cannot be loaded', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockResolvedValue(Response.json({ error: 'Error' }, { status: 502 }));
    render(<ConfigurePage />);

    await waitFor(() => expect(console.error).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: /Teamleder/ })).toBeInTheDocument();
  });

  it('sets a Norwegian tab title', () => {
    expect(metadata.title).toBe('Konfigurer intervjuer');
  });
});
