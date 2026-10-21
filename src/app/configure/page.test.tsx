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

async function renderPage(type?: string, step?: string) {
  render(
    await ConfigurePage({
      searchParams: Promise.resolve(
        type === undefined ? {} : { type, ...(step ? { step } : {}) },
      ),
    }),
  );
}

/** Opens the page, chooses the interviewer, and leaves the stilling screen. */
async function openAsInterviewer() {
  const user = userEvent.setup();
  await renderPage();
  await user.click(screen.getByRole('button', { name: /^Intervjuer/ }));
  await user.click(screen.getByRole('button', { name: 'Neste' }));
  return user;
}

/** Leaves the job seeker step without a profile, which is the step after the interviewer. */
async function skipProfile(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Fortsett uten profil' }));
  await user.click(screen.getByRole('button', { name: 'Neste' }));
}

/** Chooses an interviewer template and moves on. The card is a radio, so Neste confirms it. */
async function pickTemplate(user: ReturnType<typeof userEvent.setup>, name: RegExp) {
  await user.click(screen.getByRole('radio', { name }));
  await user.click(screen.getByRole('button', { name: 'Neste' }));
}

/** Leaves the interviewer step without a template. */
async function skipTemplate(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Fortsett uten mal' }));
  await user.click(screen.getByRole('button', { name: 'Neste' }));
}

/** Leaves the settings step, which comes after the job seeker step. */
async function skipSettings(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Neste' }));
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

    expect(screen.getByRole('heading', { level: 1, name: 'Ny intervjuagent' })).toBeVisible();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Hvilken stilling skal jobbsøkeren øve til?' }),
    ).toBeVisible();
    expect(screen.queryByText('Velg agenttype')).not.toBeInTheDocument();
    expect(screen.getByRole('list')).toBeVisible();
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

  it('returns to the interviewer step when the link asks for it', async () => {
    await renderPage('interviewer', 'intervjuer');

    expect(screen.getByRole('heading', { level: 2, name: 'Velg en mal' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Lag en ny mal' })).toHaveAttribute(
      'href',
      '/create-template?agentType=interviewer&returnTo=%2Fconfigure%3Ftype%3Dinterviewer%26step%3Dintervjuer',
    );
  });

  it('marks Intervjuer as the current section', async () => {
    await openAsInterviewer();

    expect(screen.getByRole('listitem', { current: 'step' })).toHaveTextContent('Intervjuer');
    expect(screen.queryByRole('button', { name: 'Jobbsøker' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Fullføre' })).not.toBeInTheDocument();
    expect(screen.queryByText('Velg agenttype')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Bransjer du kan velge i neste steg' })).not.toBeInTheDocument();
  });

  it('opens the last step after the settings', async () => {
    const user = await openAsInterviewer();

    await pickTemplate(user, /Teamleder/);

    expect(screen.getByRole('heading', { level: 2, name: 'Velg en jobbsøkerprofil' })).toBeVisible();
    expect(screen.getByRole('listitem', { current: 'step' })).toHaveTextContent('Jobbsøker');
    expect(screen.queryByRole('heading', { name: 'Velg en bransjemal' })).not.toBeInTheDocument();

    await skipProfile(user);

    expect(screen.getByRole('heading', { level: 2, name: 'Hvordan skal intervjuet være?' })).toBeVisible();
    expect(screen.getByRole('listitem', { current: 'step' })).toHaveTextContent('Innstillinger');
    expect(screen.queryByRole('heading', { name: 'Velg en bransjemal' })).not.toBeInTheDocument();

    await skipSettings(user);

    expect(screen.getByRole('heading', { level: 2, name: 'Fullføre' })).toBeVisible();
    expect(screen.getByRole('listitem', { current: 'step' })).toHaveTextContent('Fullføre');
    expect(screen.getByText('4 av 5 seksjoner')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Publiser' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Lagre som utkast' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Test agenten' })).toBeVisible();
    expect(screen.getByText('Teamleder')).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Velg en bransjemal' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Intervjuer' }));

    expect(screen.getByRole('heading', { level: 2, name: 'Velg en mal' })).toBeVisible();
    expect(screen.getByRole('radio', { name: /Teamleder/ })).toBeChecked();
  });

  it('opens the last step when the counsellor continues without templates', async () => {
    const user = await openAsInterviewer();

    await skipTemplate(user);
    await skipProfile(user);
    await skipSettings(user);

    expect(screen.getByRole('heading', { level: 2, name: 'Fullføre' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Publiser' })).toBeVisible();
  });

  it('goes back from the last step to the settings', async () => {
    const user = await openAsInterviewer();

    await pickTemplate(user, /Teamleder/);
    await skipProfile(user);
    await skipSettings(user);
    await user.click(screen.getByRole('button', { name: 'Gå tilbake' }));

    expect(screen.getByRole('heading', { level: 2, name: 'Hvordan skal intervjuet være?' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Neste' }));
    await user.click(screen.getByRole('button', { name: 'Innstillinger' }));

    expect(screen.getByRole('heading', { level: 2, name: 'Hvordan skal intervjuet være?' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Stilling og arbeidsplass' }));

    expect(
      screen.getByRole('heading', { level: 2, name: 'Hvilken stilling skal jobbsøkeren øve til?' }),
    ).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Fullføre' }));

    expect(screen.getByRole('heading', { level: 2, name: 'Fullføre' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Intervjuer' }));

    expect(screen.getByRole('radio', { name: /Teamleder/ })).toBeChecked();
  });

  it('forgets the templates when the agent type is changed', async () => {
    const user = await openAsInterviewer();

    await pickTemplate(user, /Teamleder/);
    await skipProfile(user);
    await skipSettings(user);
    await user.click(screen.getByRole('button', { name: 'Bytt agenttype' }));
    await user.click(screen.getByRole('button', { name: /^Intervjuer/ }));

    expect(
      screen.getByRole('heading', { level: 2, name: 'Hvilken stilling skal jobbsøkeren øve til?' }),
    ).toBeVisible();
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

    const saved = await screen.findByRole('radio', { name: /^Min butikksjef/ });
    const picker = screen.getByRole('region', { name: 'Velg en mal' });
    const cards = within(picker).getAllByRole('listitem');
    expect(cards.at(-1)).toContainElement(saved);
    expect(screen.getByRole('radio', { name: /Teamleder/ })).toBeInTheDocument();
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
    expect(screen.getByRole('radio', { name: /Teamleder/ })).toBeInTheDocument();
  });

  it('uses the chosen job seeker profile together with the chosen template', async () => {
    respondWith({ profiles: [profile] });
    const user = await openAsInterviewer();

    await pickTemplate(user, /Teamleder/);
    await user.click(await screen.findByRole('radio', { name: /Profil A/ }));
    await user.click(screen.getByRole('button', { name: 'Neste' }));
    await skipSettings(user);

    expect(screen.getByRole('heading', { level: 2, name: 'Fullføre' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Gå tilbake' }));
    await user.click(screen.getByRole('button', { name: 'Tilbake' }));

    expect(screen.getByRole('radio', { name: /Profil A/ })).toBeChecked();
  });

  it('links to a new profile from the profile step', async () => {
    const user = await openAsInterviewer();

    await skipTemplate(user);

    expect(screen.getByRole('link', { name: 'Lag en ny profil' })).toHaveAttribute(
      'href',
      '/profiles/new',
    );
  });

  it('sets a Norwegian tab title', () => {
    expect(metadata.title).toBe('Sett opp en agent');
  });
});
