import { render, screen, waitFor, within } from '@testing-library/react';
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

async function renderPage(type?: string) {
  render(
    await ConfigurePage({
      searchParams: Promise.resolve(type === undefined ? {} : { type }),
    }),
  );
}

/** Opens the page and chooses the interviewer, the step the interviewer tests start after. */
async function openAsInterviewer() {
  const user = userEvent.setup();
  await renderPage();
  await user.click(screen.getByRole('button', { name: /^Intervjuer/ }));
  return user;
}

describe('/configure', () => {
  it('starts by asking what kind of agent to set up, not with templates or the chat', async () => {
    await renderPage();

    expect(screen.getByRole('heading', { level: 1, name: 'Sett opp en agent' })).toBeVisible();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Hva slags agent vil du sette opp?' }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: /^Intervjuer/ })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Velg en mal' })).not.toBeInTheDocument();
    expect(screen.queryByRole('log', { name: 'Samtale' })).not.toBeInTheDocument();
  });

  it('shows planned agent types as coming soon, without letting them be chosen', async () => {
    await renderPage();

    const teacher = screen.getByRole('heading', { level: 3, name: 'Lærer' }).closest('li')!;
    expect(teacher).toHaveTextContent('Kommer snart');
    expect(teacher.querySelector('button')).toBeNull();
  });

  it('skips the type step when the agents page already chose one', async () => {
    await renderPage('interviewer');

    expect(screen.getByRole('heading', { level: 2, name: 'Velg en mal' })).toBeVisible();
    expect(
      screen.queryByRole('heading', { name: 'Hva slags agent vil du sette opp?' }),
    ).not.toBeInTheDocument();
  });

  it('asks for the type when the link names a type that does not exist', async () => {
    await renderPage('finnes-ikke');

    expect(
      screen.getByRole('heading', { level: 2, name: 'Hva slags agent vil du sette opp?' }),
    ).toBeVisible();
  });

  it('shows the templates once the interviewer is chosen, and can go back to the types', async () => {
    const user = await openAsInterviewer();

    expect(screen.getByText('Intervjuer', { selector: 'strong' })).toBeVisible();
    expect(screen.getByRole('heading', { level: 2, name: 'Velg en mal' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Bytt agenttype' }));

    expect(
      screen.getByRole('heading', { level: 2, name: 'Hva slags agent vil du sette opp?' }),
    ).toBeVisible();
  });

  it('shows the steps, and previews the industries grouped by sector before one can be chosen', async () => {
    await openAsInterviewer();

    expect(
      screen.getByText('Velg intervjuer og profil').closest('[aria-current="step"]'),
    ).not.toBeNull();
    expect(screen.getByText('Velg agenttype')).toBeVisible();
    expect(screen.getByText('Velg bransje')).toBeVisible();

    const preview = screen.getByRole('region', { name: 'Bransjer du kan velge i neste steg' });
    const publicList = within(preview).getByRole('list', { name: 'Offentlig sektor' });
    const privateList = within(preview).getByRole('list', { name: 'Privat sektor' });
    expect(publicList).toHaveTextContent('Helsefagarbeider · Helse og omsorg');
    expect(privateList).toHaveTextContent('Butikkmedarbeider · Varehandel');
    expect(publicList).not.toHaveTextContent('Butikkmedarbeider');
  });

  it('asks for an industry template after the interviewer template, then opens the chat', async () => {
    const user = await openAsInterviewer();

    await user.click(screen.getByRole('button', { name: /Teamleder/ }));

    expect(screen.getByRole('heading', { level: 2, name: 'Velg en bransjemal' })).toBeVisible();
    expect(screen.getByText('Velg bransje').closest('[aria-current="step"]')).not.toBeNull();
    expect(screen.queryByRole('log', { name: 'Samtale' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Helsefagarbeider/ }));

    expect(screen.getByRole('log', { name: 'Samtale' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Melding' })).toBeInTheDocument();
    expect(screen.getByText(/malen «Teamleder»/)).toBeInTheDocument();
    expect(screen.getByText(/bransjemalen «Helsefagarbeider»/)).toBeInTheDocument();
    // The industry template decides the job, so the chat asks about the company first.
    expect(screen.getByText(/Hvilken bedrift eller virksomhet/)).toBeInTheDocument();
  });

  it('asks the interviewer’s first question when no templates are chosen', async () => {
    const user = await openAsInterviewer();

    await user.click(screen.getByRole('button', { name: 'Fortsett uten mal' }));
    await user.click(screen.getByRole('button', { name: 'Fortsett uten bransjemal' }));

    expect(screen.getByText(/Hvilken stilling skal jobbsøkeren øve til\?/)).toBeInTheDocument();
  });

  it('lets the user change the interviewer template and keeps the industry template', async () => {
    const user = await openAsInterviewer();

    await user.click(screen.getByRole('button', { name: /Teamleder/ }));
    await user.click(screen.getByRole('button', { name: /Helsefagarbeider/ }));
    await user.click(screen.getByRole('button', { name: 'Bytt mal eller profil' }));

    expect(screen.getByRole('heading', { level: 2, name: 'Velg en mal' })).toBeVisible();
    expect(screen.getByText('Helsefagarbeider', { selector: 'strong' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: /HR-medarbeider/ }));

    expect(screen.getByText(/malen «HR-medarbeider»/)).toBeInTheDocument();
    expect(screen.getByText(/bransjemalen «Helsefagarbeider»/)).toBeInTheDocument();
  });

  it('lets the user change the industry template', async () => {
    const user = await openAsInterviewer();

    await user.click(screen.getByRole('button', { name: /Teamleder/ }));
    await user.click(screen.getByRole('button', { name: /Helsefagarbeider/ }));
    await user.click(screen.getByRole('button', { name: 'Bytt bransjemal' }));

    expect(screen.getByRole('heading', { level: 2, name: 'Velg en bransjemal' })).toBeVisible();
  });

  it('can continue without templates, and choose them afterwards', async () => {
    const user = await openAsInterviewer();

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

  it('forgets the templates when the agent type is changed', async () => {
    const user = await openAsInterviewer();

    await user.click(screen.getByRole('button', { name: /Teamleder/ }));
    await user.click(screen.getByRole('button', { name: /Helsefagarbeider/ }));
    await user.click(screen.getByRole('button', { name: 'Bytt agenttype' }));
    await user.click(screen.getByRole('button', { name: /^Intervjuer/ }));

    expect(screen.getByRole('heading', { level: 2, name: 'Velg en mal' })).toBeVisible();
    expect(screen.queryByText('Helsefagarbeider', { selector: 'strong' })).not.toBeInTheDocument();
  });

  it('shows the counsellor’s saved templates after the built-in ones', async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        templates: [
          {
            id: 'saved-1',
            agentType: 'interviewer',
            title: 'Min butikksjef',
            description: 'Lagret av meg.',
            focus: ['Service'],
            persona: 'Intervjueren er butikksjef.',
          },
        ],
      }),
    );
    await openAsInterviewer();

    const saved = await screen.findByRole('button', { name: /^Min butikksjef/ });
    const picker = screen.getByRole('region', { name: 'Velg en mal' });
    const cards = within(picker).getAllByRole('listitem');
    expect(cards.at(-1)).toContainElement(saved);
    expect(screen.getByRole('button', { name: /Teamleder/ })).toBeInTheDocument();
  });

  it('removes a saved template from the picker once it is deleted', async () => {
    const saved = {
      id: 'saved-1',
      agentType: 'interviewer',
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
    const user = await openAsInterviewer();

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
    await openAsInterviewer();

    await waitFor(() => expect(console.error).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: /Teamleder/ })).toBeInTheDocument();
  });

  it('uses the chosen job seeker profile together with the chosen template', async () => {
    respondWith({ profiles: [profile] });
    const user = await openAsInterviewer();

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

  it('links to the profiles page from the profile choice', async () => {
    await openAsInterviewer();

    expect(screen.getByRole('link', { name: 'Administrer profiler' })).toHaveAttribute(
      'href',
      '/profiles',
    );
  });

  it('sets a Norwegian tab title', () => {
    expect(metadata.title).toBe('Sett opp en agent');
  });
});
