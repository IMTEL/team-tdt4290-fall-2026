import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ConfigurePage, { metadata } from './page';

const fetchMock = vi.fn<typeof fetch>();

const profile = {
  id: 'profile-1',
  label: 'Profil A',
  ageRange: '18-24',
  experienceLevel: 'little',
  workExperience: '',
  education: '',
  languages: [],
  practiceAreas: ['Mestre nervøsitet'],
  notes: '',
};

/** Answers the page's two loads: saved templates and job seeker profiles. */
function respondWith({
  templates = [],
  profiles = [],
}: {
  templates?: unknown[];
  profiles?: unknown[];
}) {
  fetchMock.mockImplementation(async (url) =>
    String(url) === '/api/profiles' ? Response.json({ profiles }) : Response.json({ templates }),
  );
}

beforeEach(() => {
  // By default the counsellor has no saved templates and no profiles.
  respondWith({});
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

  it('asks for an industry template after the interviewer template, then opens the chat', async () => {
    const user = userEvent.setup();
    render(<ConfigurePage />);

    await user.click(screen.getByRole('button', { name: /Teamleder/ }));

    expect(screen.getByRole('heading', { level: 2, name: 'Velg en bransjemal' })).toBeVisible();
    expect(screen.queryByRole('log', { name: 'Samtale' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Helsefagarbeider/ }));

    expect(screen.getByRole('log', { name: 'Samtale' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Melding' })).toBeInTheDocument();
    expect(screen.getByText(/malen «Teamleder»/)).toBeInTheDocument();
    expect(screen.getByText(/bransjemalen «Helsefagarbeider»/)).toBeInTheDocument();
  });

  it('lets the user change the interviewer template and keeps the industry template', async () => {
    const user = userEvent.setup();
    render(<ConfigurePage />);

    await user.click(screen.getByRole('button', { name: /Teamleder/ }));
    await user.click(screen.getByRole('button', { name: /Helsefagarbeider/ }));
    await user.click(screen.getByRole('button', { name: 'Bytt mal eller profil' }));

    expect(screen.getByRole('heading', { level: 2, name: 'Velg en mal' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: /HR-medarbeider/ }));

    expect(screen.getByText(/malen «HR-medarbeider»/)).toBeInTheDocument();
    expect(screen.getByText(/bransjemalen «Helsefagarbeider»/)).toBeInTheDocument();
  });

  it('lets the user change the industry template', async () => {
    const user = userEvent.setup();
    render(<ConfigurePage />);

    await user.click(screen.getByRole('button', { name: /Teamleder/ }));
    await user.click(screen.getByRole('button', { name: /Helsefagarbeider/ }));
    await user.click(screen.getByRole('button', { name: 'Bytt bransjemal' }));

    expect(screen.getByRole('heading', { level: 2, name: 'Velg en bransjemal' })).toBeVisible();
  });

  it('can continue without templates, and choose them afterwards', async () => {
    const user = userEvent.setup();
    render(<ConfigurePage />);

    await user.click(screen.getByRole('button', { name: 'Fortsett uten mal' }));
    await user.click(screen.getByRole('button', { name: 'Fortsett uten bransjemal' }));

    expect(screen.getByRole('log', { name: 'Samtale' })).toBeInTheDocument();
    expect(screen.getByText('Ingen mal valgt')).toBeVisible();
    expect(screen.getByText('Ingen bransjemal valgt')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Velg en bransjemal' }));

    expect(screen.getByRole('heading', { level: 2, name: 'Velg en bransjemal' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Bytt mal eller profil' }));

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

  it('uses the chosen job seeker profile together with the chosen template', async () => {
    respondWith({ profiles: [profile] });
    const user = userEvent.setup();
    render(<ConfigurePage />);

    await user.click(screen.getByRole('combobox', { name: 'Jobbsøkerprofil' }));
    await user.click(await screen.findByRole('option', { name: /Profil A/ }));
    await user.click(screen.getByRole('button', { name: /Teamleder/ }));
    await user.click(screen.getByRole('button', { name: 'Fortsett uten bransjemal' }));

    expect(screen.getByText(/jobbsøkerprofilen «Profil A»/)).toBeInTheDocument();
    expect(screen.getByText('Profil A')).toBeVisible();

    // Going back keeps the profile, so only the template needs choosing again.
    await user.click(screen.getByRole('button', { name: 'Bytt mal eller profil' }));
    expect(screen.getByRole('combobox', { name: 'Jobbsøkerprofil' })).toHaveTextContent('Profil A');
  });

  it('links to the profiles page from the profile choice', () => {
    render(<ConfigurePage />);

    expect(screen.getByRole('link', { name: 'Administrer profiler' })).toHaveAttribute(
      'href',
      '/profiles',
    );
  });

  it('sets a Norwegian tab title', () => {
    expect(metadata.title).toBe('Konfigurer intervjuer');
  });
});
