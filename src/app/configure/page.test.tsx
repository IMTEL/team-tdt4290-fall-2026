import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { builtInLegalTemplateIds } from '@/data/legal-templates';

import ConfigurePage, { metadata } from './page';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

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

/** Answers the page's loads: saved templates, job seeker profiles, stillingsmaler and bransjer. */
function respondWith({
  templates = [],
  profiles = [],
  jobTemplates = [],
  industryTemplates = [],
}: {
  templates?: unknown[];
  profiles?: unknown[];
  jobTemplates?: unknown[];
  /** Bransjemaler from /api/industry-templates. */
  industryTemplates?: unknown[];
}) {
  fetchMock.mockImplementation(async (url) => {
    const path = String(url);
    if (path === '/api/profiles') return Response.json({ profiles });
    if (path === '/api/job-templates') return Response.json({ templates: jobTemplates });
    if (path === '/api/industry-templates') return Response.json({ templates: industryTemplates });
    return Response.json({ templates });
  });
}

const ownJob = {
  id: 'job-1',
  title: 'Lagermedarbeider natt',
  industry: 'Logistikk',
  sector: 'privat',
  description: 'Plukk og pakking om natten.',
  tasks: [],
  jobDescription: 'Jobber på et stort lager om natten.',
};

beforeEach(() => {
  // By default the counsellor has no saved templates and no profiles.
  respondWith({});
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  fetchMock.mockReset();
  push.mockReset();
  sessionStorage.clear();
  localStorage.clear();
});

async function renderPage(type?: string, step?: string, extra?: { startNew?: boolean }) {
  render(
    await ConfigurePage({
      searchParams: Promise.resolve(
        type === undefined
          ? {}
          : { type, ...(step ? { step } : {}), ...(extra?.startNew ? { new: '1' } : {}) },
      ),
    }),
  );
}

/** Opens the page, chooses the interviewer, fills the required stilling fields, and leaves that screen. */
async function openAsInterviewer() {
  const user = userEvent.setup();
  await renderPage();
  await user.click(screen.getByRole('button', { name: /^Intervjuer/ }));
  await user.click(screen.getByRole('textbox', { name: /Stilling/ }));
  await user.paste('Barnehageassistent');
  await user.click(screen.getByRole('button', { name: 'Helsefagarbeider' }));
  await user.click(screen.getByRole('button', { name: 'Helse og omsorg' }));
  await user.click(screen.getByRole('button', { name: 'Offentlig' }));
  await user.click(screen.getByRole('button', { name: 'Neste' }));
  return user;
}

/** Leaves the job seeker step without a profile, which is the step after the interviewer. */
async function skipProfile(user: ReturnType<typeof userEvent.setup>) {
  const without = screen.getByRole('button', { name: 'Fortsett uten jobbsøkermal' });
  await user.click(without);
  expect(without).toHaveAttribute('aria-pressed', 'true');
  expect(
    within(screen.getByRole('region', { name: 'Dine valg' })).getByText('Jobbsøkermal')
      .nextElementSibling,
  ).toHaveTextContent('Ingen mal er valgt, så intervjueren får ingen beskrivelse av jobbsøkeren.');
  await user.click(screen.getByRole('button', { name: 'Neste' }));
}

/** Chooses an interviewer template and moves on. The card is a radio, so Neste confirms it. */
async function pickTemplate(user: ReturnType<typeof userEvent.setup>, name: RegExp) {
  await user.click(screen.getByRole('radio', { name }));
  expect(screen.getByRole('button', { name: 'Fortsett uten intervjuermal' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await user.click(screen.getByRole('button', { name: 'Neste' }));
}

/** Leaves the interviewer step without a template. */
async function skipTemplate(user: ReturnType<typeof userEvent.setup>) {
  const without = screen.getByRole('button', { name: 'Fortsett uten intervjuermal' });
  await user.click(without);
  expect(without).toHaveAttribute('aria-pressed', 'true');
  expect(
    within(screen.getByRole('region', { name: 'Dine valg' })).getByText('Mal', { exact: true })
      .nextElementSibling,
  ).toHaveTextContent('Ingen mal er valgt, så intervjueren er nøytral og profesjonell.');
  await user.click(screen.getByRole('button', { name: 'Neste' }));
}

/** Fills in the required settings and goes straight to Fullføre, skipping AI-innstillinger. */
async function skipSettings(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Første intervju' }));
  await user.click(screen.getByRole('button', { name: 'Lett' }));
  await user.click(screen.getByRole('button', { name: '5–6' }));
  await user.click(screen.getByRole('button', { name: 'Ja' }));
  await user.click(screen.getByRole('button', { name: 'Neste' }));
}

/** Opens Publiser on Fullføre and confirms the same dialog as on the agent's page. */
async function confirmPublish(user: ReturnType<typeof userEvent.setup>, description = '') {
  await user.click(screen.getByRole('button', { name: 'Publiser' }));
  const dialog = await screen.findByRole('dialog');
  if (description) {
    await user.type(within(dialog).getByLabelText('Kort beskrivelse'), description);
  }
  await user.click(within(dialog).getByRole('button', { name: 'Publiser' }));
}

const published = {
  isPublished: true,
  publicName: 'Intervjuer',
  publicDescription: '',
};

/** A successful publish, so the last step can leave the page. */
function publicationResponse() {
  return Response.json({ publication: published });
}

describe('/configure', () => {
  it('starts by asking what kind of agent to set up, not with templates or the chat', async () => {
    await renderPage();

    expect(screen.getByRole('heading', { level: 1, name: 'Sett opp en agent' })).toBeVisible();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Hva slags agent vil du sette opp?' }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: /^Intervjuer/ })).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Velg en intervjuermal' }),
    ).not.toBeInTheDocument();
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
    const jobs = screen.getByRole('group', { name: /Stillingsmaler/ });
    const industries = screen.getByRole('group', { name: /^Bransje/ });
    expect(within(jobs).getAllByRole('button')[0]).toHaveAccessibleName('Ingen mal');
    expect(within(industries).getAllByRole('button')[0]).toHaveAccessibleName('Ingen bransje');
    expect(screen.getByRole('button', { name: 'Neste' })).toBeDisabled();
    expect(document.getElementById('job-templates-label')).toHaveTextContent('*');
    expect(document.getElementById('industry-label')).toHaveTextContent('*');
    expect(document.getElementById('employer-label')).toHaveTextContent('*');
    await userEvent
      .setup()
      .hover(screen.getByRole('button', { name: 'Hva betyr Stillingsmaler?' }));
    expect(
      await screen.findByRole('tooltip', { name: /En stillingsmal fyller inn/ }),
    ).toBeVisible();
    expect(
      screen.queryByRole('heading', { name: 'Hva slags agent vil du sette opp?' }),
    ).not.toBeInTheDocument();
  });

  it('fills in the job title, industry and employer from the chosen stillingsmal', async () => {
    const user = userEvent.setup();
    await renderPage('interviewer');

    await user.click(screen.getByRole('button', { name: 'Butikkmedarbeider' }));

    expect(screen.getByRole('textbox', { name: /Stilling/ })).toHaveValue('Butikkmedarbeider');
    expect(screen.getByRole('button', { name: 'Varehandel' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Privat' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Neste' })).toBeEnabled();

    // Another stillingsmal replaces the title the first one filled in.
    await user.click(screen.getByRole('button', { name: 'Helsefagarbeider' }));
    expect(screen.getByRole('textbox', { name: /Stilling/ })).toHaveValue('Helsefagarbeider');
    expect(screen.getByRole('button', { name: 'Offentlig' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('summarises the stilling choices above Neste', async () => {
    const user = userEvent.setup();
    await renderPage('interviewer');

    expect(screen.queryByRole('region', { name: 'Dine valg' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Butikkmedarbeider' }));

    const summary = screen.getByRole('region', { name: 'Dine valg' });
    expect(within(summary).getByText('Stilling').nextElementSibling).toHaveTextContent(
      'Butikkmedarbeider',
    );
    expect(within(summary).getByText('Stillingsmal').nextElementSibling).toHaveTextContent(
      'Butikkmedarbeider',
    );
    expect(within(summary).getByText('Bransje').nextElementSibling).toHaveTextContent('Varehandel');
    expect(within(summary).getByText('Arbeidsgiver').nextElementSibling).toHaveTextContent(
      'Privat',
    );
    expect(
      summary.compareDocumentPosition(screen.getByRole('button', { name: 'Neste' })) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Ingen mal' }));
    expect(within(summary).getByText('Stillingsmal').nextElementSibling).toHaveTextContent(
      'Ingen mal er valgt, så intervjueren får ingen stillingsbeskrivelse.',
    );
  });

  it('shows a short bubble for the chosen stillingsmal, and Se hele opens the rest', async () => {
    const user = userEvent.setup();
    await renderPage('interviewer');

    expect(screen.queryByRole('region', { name: 'Valgte maler' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Butikkmedarbeider' }));

    const peeks = screen.getByRole('region', { name: 'Valgte maler' });
    expect(peeks).toHaveTextContent('Stillingsmal');
    expect(peeks).toHaveTextContent('Kundeservice, kasse og varepåfylling');
    expect(peeks).toHaveTextContent('Bransje');
    expect(peeks).toHaveTextContent('Varehandel');
    expect(
      screen.getByRole('complementary', { name: 'Seksjoner' }).compareDocumentPosition(peeks) &
        Node.DOCUMENT_POSITION_CONTAINED_BY,
    ).toBeTruthy();

    const seeWhole = screen.getByRole('button', { name: 'Se hele' });
    const back = screen.getByRole('link', { name: 'Tilbake' });
    expect(seeWhole.compareDocumentPosition(back) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(
      back.compareDocumentPosition(screen.getByRole('button', { name: 'Neste' })) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    await user.click(
      screen.getByRole('button', { name: 'Stillingsmal: Butikkmedarbeider. Se hele.' }),
    );
    const dialog = await screen.findByRole('dialog', { name: 'Stillingsmal: Butikkmedarbeider' });
    expect(dialog).toHaveTextContent('Hjelper kunder, sitter i kassen');
    expect(dialog).toHaveTextContent('Kundeservice, Kasse, Varepåfylling');
    await user.click(within(dialog).getByRole('button', { name: 'Lukk' }));
    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: 'Stillingsmal: Butikkmedarbeider' }),
      ).not.toBeInTheDocument();
    });
  });

  it('opens the interviewer template contents from the bubble and from Se hele', async () => {
    const user = await openAsInterviewer();

    await user.click(screen.getByRole('radio', { name: /Teamleder/ }));

    const peeks = screen.getByRole('region', { name: 'Valgte maler' });
    expect(peeks).toHaveTextContent('Intervjuermal');
    expect(peeks).toHaveTextContent('Praktisk og uformell');
    expect(peeks).not.toHaveTextContent('Helsefagarbeider');
    expect(peeks).not.toHaveTextContent('Stillingsmal');

    const seeWhole = screen.getByRole('button', { name: 'Se hele' });
    expect(
      seeWhole.compareDocumentPosition(screen.getByRole('button', { name: 'Tilbake' })) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    await user.click(seeWhole);
    const dialog = await screen.findByRole('dialog', { name: 'Intervjuermal: Teamleder' });
    expect(dialog).toHaveTextContent('nærmeste leder');
    expect(dialog).toHaveTextContent('Arbeidsoppgaver, Samarbeid i teamet, Situasjoner');
  });

  it('opens the job seeker template contents from the bubble', async () => {
    respondWith({ profiles: [profile] });
    const user = await openAsInterviewer();
    await skipTemplate(user);

    await user.click(screen.getByRole('radio', { name: /Profil A/ }));

    expect(screen.getByRole('region', { name: 'Valgte maler' })).toHaveTextContent('18–24 år');
    await user.click(screen.getByRole('button', { name: 'Jobbsøkermal: Profil A. Se hele.' }));
    const dialog = await screen.findByRole('dialog', { name: 'Jobbsøkermal: Profil A' });
    expect(dialog).toHaveTextContent('Litt (under 1 år)');
    expect(dialog).toHaveTextContent('Nervøsitet');
  });

  it('keeps a job title the counsellor wrote when a stillingsmal is chosen', async () => {
    const user = userEvent.setup();
    await renderPage('interviewer');

    await user.click(screen.getByRole('textbox', { name: /Stilling/ }));
    await user.paste('Butikkansatt deltid');
    await user.click(screen.getByRole('button', { name: 'Butikkmedarbeider' }));

    expect(screen.getByRole('textbox', { name: /Stilling/ })).toHaveValue('Butikkansatt deltid');
    expect(screen.getByRole('button', { name: 'Varehandel' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('offers the counsellor’s own stillingsmaler and bransjer, and saves the job description', async () => {
    respondWith({
      jobTemplates: [ownJob],
      industryTemplates: [{ id: 'industry-1', name: 'Renhold', description: 'Vask.' }],
    });
    const post = vi.fn(async () => Response.json({ id: 'agent-1' }));
    const load = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (url, init) => {
      const path = String(url);
      const method = init?.method ?? 'GET';
      if (path === '/api/agents' && method === 'POST') return post();
      if (path === '/api/agents/agent-1/publish' && method === 'POST') return publicationResponse();
      return load(url, init);
    });
    const user = userEvent.setup();
    await renderPage('interviewer');

    // The counsellor's own come first, so they are among the suggestions.
    await user.click(await screen.findByRole('button', { name: 'Lagermedarbeider natt' }));
    const industries = screen.getByRole('group', { name: /^Bransje/ });
    expect(within(industries).getByRole('button', { name: 'Logistikk' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await user.click(within(industries).getByRole('button', { name: 'Se alle maler' }));
    expect(within(industries).getByRole('button', { name: 'Renhold' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Neste' }));
    await skipTemplate(user);
    await skipProfile(user);
    await skipSettings(user);
    await confirmPublish(user);

    await waitFor(() => expect(post).toHaveBeenCalled());
    const call = fetchMock.mock.calls.find(
      ([url, init]) => String(url) === '/api/agents' && init?.method === 'POST',
    );
    const body = JSON.parse(String(call?.[1]?.body));
    expect(body.configuration.stilling).toBe(
      'Lagermedarbeider natt. Jobber på et stort lager om natten.',
    );
    expect(body.configuration.bransje).toBe('Logistikk (privat)');
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
    expect(screen.getByRole('heading', { level: 2, name: 'Velg en intervjuermal' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Bytt agenttype' }));

    expect(
      screen.getByRole('heading', { level: 2, name: 'Hva slags agent vil du sette opp?' }),
    ).toBeVisible();
  });

  it('returns to the interviewer step when the link asks for it', async () => {
    await renderPage('interviewer', 'intervjuer');

    expect(screen.getByRole('heading', { level: 2, name: 'Velg en intervjuermal' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Lag en ny intervjuermal' })).toHaveAttribute(
      'href',
      expect.stringMatching(
        /^\/create-template\?agentType=interviewer&returnTo=%2Fconfigure%3Ftype%3Dinterviewer%26draft%3D.+%26step%3Dintervjuer$/,
      ),
    );
    const skip = screen.getByRole('button', { name: 'Fortsett uten intervjuermal' });
    const legal = screen.getByRole('group', { name: 'Lovverk' });
    expect(skip.compareDocumentPosition(legal) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(
      screen.getByRole('checkbox', { name: 'Rettigheter i ansettelsesprosessen' }),
    ).toBeChecked();
    expect(screen.queryByRole('group', { name: 'Norge' })).not.toBeInTheDocument();
  });

  it('marks Intervjuer as the current section', async () => {
    await openAsInterviewer();

    expect(screen.getByRole('listitem', { current: 'step' })).toHaveTextContent('Intervjuer');
    expect(screen.queryByRole('button', { name: 'Jobbsøker' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Fullføre' })).not.toBeInTheDocument();
    expect(screen.queryByText('Velg agenttype')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('region', { name: 'Bransjer du kan velge i neste steg' }),
    ).not.toBeInTheDocument();
  });

  it('opens the last step after the settings', async () => {
    const user = await openAsInterviewer();

    await pickTemplate(user, /Teamleder/);

    expect(screen.getByRole('heading', { level: 2, name: 'Velg en jobbsøkermal' })).toBeVisible();
    expect(screen.getByRole('listitem', { current: 'step' })).toHaveTextContent('Jobbsøker');
    expect(screen.queryByRole('heading', { name: 'Velg en stillingsmal' })).not.toBeInTheDocument();

    await skipProfile(user);

    expect(
      screen.getByRole('heading', { level: 2, name: 'Hvordan skal intervjuet være?' }),
    ).toBeVisible();
    expect(screen.getByRole('listitem', { current: 'step' })).toHaveTextContent('Innstillinger');
    expect(screen.queryByRole('heading', { name: 'Velg en stillingsmal' })).not.toBeInTheDocument();

    await skipSettings(user);

    expect(screen.getByRole('heading', { level: 2, name: 'Fullføre' })).toBeVisible();
    expect(screen.getByRole('listitem', { current: 'step' })).toHaveTextContent('Fullføre');
    expect(screen.getByText('5 av 6 seksjoner')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Publiser' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Lagre som privat agent' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Test agenten' })).toBeVisible();
    expect(screen.getByRole('complementary', { name: 'Seksjoner' })).not.toContainElement(
      screen.getByRole('button', { name: 'Publiser' }),
    );
    expect(screen.getByRole('radio', { name: 'Standard' })).toBeChecked();
    const filledIn = screen.getByRole('region', { name: 'Det du har fylt inn' });
    expect(within(filledIn).getByText('Teamleder', { selector: 'dd' })).toBeVisible();
    expect(screen.getByRole('complementary', { name: 'Seksjoner' })).not.toContainElement(filledIn);
    expect(screen.queryByRole('heading', { name: 'Velg en stillingsmal' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Intervjuer' }));

    expect(screen.getByRole('heading', { level: 2, name: 'Velg en intervjuermal' })).toBeVisible();
    expect(screen.getByRole('radio', { name: /Teamleder/ })).toBeChecked();
    // Jumping back must not reset the side progress or clear later section marks.
    expect(screen.getByText('5 av 6 seksjoner')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Fullføre' })).toBeVisible();
  });

  it('opens AI-innstillinger from settings, or skips it with Neste', async () => {
    const user = await openAsInterviewer();

    await skipTemplate(user);
    await skipProfile(user);
    await user.click(screen.getByRole('button', { name: 'Første intervju' }));
    await user.click(screen.getByRole('button', { name: 'Lett' }));
    await user.click(screen.getByRole('button', { name: '5–6' }));
    await user.click(screen.getByRole('button', { name: 'Ja' }));

    const settingsSummary = screen.getByRole('region', { name: 'Dine valg' });
    expect(within(settingsSummary).getByText('Intervjutype').nextElementSibling).toHaveTextContent(
      'Første intervju',
    );
    expect(
      within(settingsSummary).getByText('Vanskelighetsgrad').nextElementSibling,
    ).toHaveTextContent('Lett');
    expect(
      settingsSummary.compareDocumentPosition(screen.getByRole('button', { name: 'Neste' })) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'AI-innstillinger' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'AI-innstillinger' }));

    expect(screen.getByRole('heading', { level: 2, name: 'AI-innstillinger' })).toBeVisible();
    expect(screen.getByRole('listitem', { current: 'step' })).toHaveTextContent('AI-innstillinger');
    expect(screen.getByRole('button', { name: 'Neste' })).toBeVisible();
    expect(screen.getByRole('combobox', { name: 'Språkmodell' })).toBeVisible();
    expect(screen.getByText(/Du kan hoppe over dette steget/)).toBeVisible();
    expect(
      within(screen.getByRole('region', { name: 'Dine valg' })).getByText('Språkmodell')
        .nextElementSibling,
    ).toHaveTextContent('openai/gpt-oss-120b');

    await user.click(screen.getByRole('button', { name: 'Neste' }));

    expect(screen.getByRole('heading', { level: 2, name: 'Fullføre' })).toBeVisible();
  });

  it('opens the last step when the counsellor continues without templates', async () => {
    const user = await openAsInterviewer();

    await skipTemplate(user);
    await skipProfile(user);
    await skipSettings(user);

    expect(screen.getByRole('heading', { level: 2, name: 'Fullføre' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Publiser' })).toBeVisible();
  });

  it('shows on the last step how the answers shape the interviewer', async () => {
    const user = await openAsInterviewer();

    await skipTemplate(user);
    await skipProfile(user);
    await skipSettings(user);

    expect(screen.getByText('Hvordan valgene former intervjueren')).toBeVisible();
    expect(screen.getByRole('region', { name: 'Det du har fylt inn' })).toBeVisible();
    const effects = screen.getByRole('region', { name: 'Slik former svarene dine agenten' });
    expect(within(effects).getByText('Intervjuer').nextElementSibling).toHaveTextContent(
      'Ingen mal er valgt, så intervjueren er nøytral og profesjonell.',
    );
    expect(within(effects).getByText('Stilling')).toBeVisible();
  });

  it('publishes the interviewer from the last step and opens the agents page', async () => {
    const savedAgent = {
      id: 'agent-1',
      name: 'Intervjuer for Barnehageassistent',
      description: '{}',
      lastUpdated: '2026-10-21T00:00:00.000Z',
      llmModel: 'openai/gpt-oss-120b',
      temperature: 0.7,
      prompt: 'Du er en intervjuer',
    };
    fetchMock.mockImplementation(async (url, init) => {
      const path = String(url);
      const method = init?.method ?? 'GET';
      if (path === '/api/agents' && method === 'POST') return Response.json({ id: 'agent-1' });
      if (path === '/api/agents/agent-1/publish' && method === 'POST') return publicationResponse();
      if (path === '/api/agents/agent-1' && method === 'PUT') {
        return Response.json({ agent: savedAgent });
      }
      if (path === '/api/profiles') return Response.json({ profiles: [] });
      return Response.json({ templates: [] });
    });

    const user = await openAsInterviewer();
    await pickTemplate(user, /Teamleder/);
    await skipProfile(user);
    await skipSettings(user);

    expect(screen.getByRole('textbox', { name: 'Navn på agenten' })).toHaveValue(
      'Intervjuer for Barnehageassistent',
    );

    await confirmPublish(user, 'Øv på et første intervju');

    await waitFor(() => expect(push).toHaveBeenCalledWith('/browse-agents'));
    expect(sessionStorage.getItem('kfi-agents-flash')).toBe('agent-publisert');
    const publishCall = fetchMock.mock.calls.find(
      ([url, init]) => String(url) === '/api/agents/agent-1/publish' && init?.method === 'POST',
    );
    expect(JSON.parse(String(publishCall?.[1]?.body))).toEqual({
      publicName: 'Intervjuer for Barnehageassistent',
      publicDescription: 'Øv på et første intervju',
    });
    const post = fetchMock.mock.calls.find(
      ([url, init]) => String(url) === '/api/agents' && init?.method === 'POST',
    );
    const body = JSON.parse(String(post?.[1]?.body));
    expect(body).toMatchObject({
      name: 'Intervjuer for Barnehageassistent',
      type: 'interviewer',
      avatar: null,
      sources: { intervjuer: { kind: 'template', id: 'teamleder' } },
      configuration: {
        intervjutype: 'første intervju',
        bedrift: 'ikke oppgitt',
        egneSporsmal: 'ingen',
        bransje: 'Helse og omsorg (offentlig)',
        vanskelighetsgrad: 'lett | Antall spørsmål: 5–6 | Oppfølgingsspørsmål: ja',
        jobbsoker: 'ingen opplysninger om jobbsøkeren',
      },
    });
    expect(body.configuration.stilling).toContain('Barnehageassistent.');
    expect(body.configuration.intervjuer).toContain('teamleder');
  });

  it('asks before publishing and publishes nothing when that is cancelled', async () => {
    const user = await openAsInterviewer();
    await skipTemplate(user);
    await skipProfile(user);
    await skipSettings(user);

    await user.click(screen.getByRole('button', { name: 'Publiser' }));
    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByRole('heading', { name: 'Publiser til The Candidate' }),
    ).toBeVisible();
    expect(within(dialog).getByText('Ikke skriv noe om jobbsøkeren her.')).toBeVisible();
    await user.click(within(dialog).getByRole('button', { name: 'Avbryt' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(fetchMock).not.toHaveBeenCalledWith(
      '/api/agents',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Fullføre' })).toBeVisible();
  });

  it('saves a private agent and goes to the agents page', async () => {
    fetchMock.mockImplementation(async (url, init) => {
      const path = String(url);
      if (path === '/api/agents' && (init?.method ?? 'GET') === 'POST') {
        return Response.json({ id: 'agent-draft' });
      }
      if (path === '/api/profiles') return Response.json({ profiles: [] });
      return Response.json({ templates: [] });
    });

    const user = await openAsInterviewer();
    await skipTemplate(user);
    await skipProfile(user);
    await skipSettings(user);

    await user.click(screen.getByRole('button', { name: 'Lagre som privat agent' }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/browse-agents'));
    expect(sessionStorage.getItem('kfi-agents-flash')).toBe('agent-lagret');
  });

  it('saves the interviewer and opens the test with that agent', async () => {
    fetchMock.mockImplementation(async (url, init) => {
      const path = String(url);
      const method = init?.method ?? 'GET';
      if (path === '/api/agents' && method === 'POST') return Response.json({ id: 'agent-1' });
      if (path === '/api/agents/agent-1' && method === 'PUT') {
        return Response.json({
          agent: {
            id: 'agent-1',
            name: 'Intervjuer for Barnehageassistent',
            description: '{}',
            lastUpdated: '2026-10-21T00:00:00.000Z',
            llmModel: 'openai/gpt-oss-120b',
            temperature: 0.7,
            prompt: 'Du er en intervjuer',
          },
        });
      }
      if (path === '/api/profiles') return Response.json({ profiles: [] });
      return Response.json({ templates: [] });
    });

    const user = await openAsInterviewer();
    await pickTemplate(user, /Teamleder/);
    await skipProfile(user);
    await skipSettings(user);

    await user.click(screen.getByRole('button', { name: 'Test agenten' }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/test-chat?agent=agent-1'));
  });

  it('saves the chosen legal templates, built in and saved, with the interviewer', async () => {
    const saved = {
      id: 'legal-1',
      title: 'Intern regel om helse',
      description: 'Helseopplysninger',
      text: 'Ikke spør om helse.',
      builtIn: false,
    };
    fetchMock.mockImplementation(async (url, init) => {
      const path = String(url);
      const method = init?.method ?? 'GET';
      if (path === '/api/agents' && method === 'POST') return Response.json({ id: 'agent-1' });
      if (path === '/api/agents/agent-1/publish' && method === 'POST') return publicationResponse();
      if (path === '/api/legal-templates') return Response.json({ templates: [saved] });
      if (path === '/api/profiles') return Response.json({ profiles: [] });
      return Response.json({ templates: [] });
    });

    const user = await openAsInterviewer();
    await user.click(await screen.findByRole('checkbox', { name: 'Intern regel om helse' }));
    await skipTemplate(user);
    await skipProfile(user);
    await skipSettings(user);

    expect(screen.getByText(/Intern regel om helse/)).toBeVisible();

    await confirmPublish(user);

    await waitFor(() => expect(push).toHaveBeenCalledWith('/browse-agents'));
    const post = fetchMock.mock.calls.find(
      ([url, init]) => String(url) === '/api/agents' && init?.method === 'POST',
    );
    const body = JSON.parse(String(post?.[1]?.body));
    expect(body.sources.lovverk).toEqual({
      kind: 'legal',
      ids: [...builtInLegalTemplateIds(), 'legal-1'],
    });
    expect(body.configuration.lovverk).toContain('Likestillings- og diskrimineringsloven § 30:');
    expect(body.configuration.lovverk).toContain('Intern regel om helse:\nIkke spør om helse.');
  });

  it('goes back from the last step to the settings', async () => {
    const user = await openAsInterviewer();

    await pickTemplate(user, /Teamleder/);
    await skipProfile(user);
    await skipSettings(user);
    await user.click(screen.getByRole('button', { name: 'Gå tilbake' }));

    expect(screen.getByRole('heading', { level: 2, name: 'AI-innstillinger' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Neste' }));
    await user.click(screen.getByRole('button', { name: 'Innstillinger' }));

    expect(
      screen.getByRole('heading', { level: 2, name: 'Hvordan skal intervjuet være?' }),
    ).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Stilling og arbeidsplass' }));

    expect(
      screen.getByRole('heading', { level: 2, name: 'Hvilken stilling skal jobbsøkeren øve til?' }),
    ).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Fullføre' }));

    expect(screen.getByRole('heading', { level: 2, name: 'Fullføre' })).toBeVisible();
    await user.click(screen.getByRole('radio', { name: 'Rev' }));
    expect(screen.getByRole('radio', { name: 'Rev' })).toBeChecked();

    await user.click(screen.getByRole('button', { name: 'Stilling og arbeidsplass' }));
    await user.click(screen.getByRole('button', { name: 'Fullføre' }));

    expect(screen.getByRole('radio', { name: 'Rev' })).toBeChecked();

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
    const picker = screen.getByRole('region', { name: 'Velg en intervjuermal' });
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
    expect(screen.getByRole('button', { name: 'Nervøsitet' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await user.click(screen.getByRole('button', { name: 'Hull i CV-en' }));
    await user.click(screen.getByRole('button', { name: 'Andre' }));
    await user.type(screen.getByRole('textbox', { name: 'Andre områder' }), 'turnus, lønn');
    expect(screen.getByText('Skriv komma mellom hver ting.')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Neste' }));
    await skipSettings(user);

    expect(screen.getByRole('heading', { level: 2, name: 'Fullføre' })).toBeVisible();
    expect(screen.getByText('Nervøsitet, Hull i CV-en, turnus, lønn')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Gå tilbake' }));
    await user.click(screen.getByRole('button', { name: 'Tilbake' }));
    await user.click(screen.getByRole('button', { name: 'Tilbake' }));

    expect(screen.getByRole('radio', { name: /Profil A/ })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Nervøsitet' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Hull i CV-en' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Andre' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('textbox', { name: 'Andre områder' })).toHaveValue('turnus, lønn');
  });

  it('clears practice areas when switching from a profile to without one', async () => {
    respondWith({ profiles: [profile] });
    const user = await openAsInterviewer();

    await pickTemplate(user, /Teamleder/);
    await user.click(await screen.findByRole('radio', { name: /Profil A/ }));
    expect(screen.getByRole('button', { name: 'Nervøsitet' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await user.click(screen.getByRole('button', { name: 'Fortsett uten jobbsøkermal' }));

    expect(screen.getByRole('button', { name: 'Fortsett uten jobbsøkermal' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Nervøsitet' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.queryByRole('textbox', { name: 'Andre områder' })).not.toBeInTheDocument();
  });

  it('lets the counsellor edit or delete a job seeker profile from the picker', async () => {
    fetchMock.mockImplementation(async (url, init) => {
      const path = String(url);
      if (init?.method === 'DELETE') return new Response(null, { status: 204 });
      if (path === '/api/profiles') return Response.json({ profiles: [profile] });
      return Response.json({ templates: [] });
    });
    const user = await openAsInterviewer();
    await skipTemplate(user);

    expect(await screen.findByRole('link', { name: 'Rediger Profil A' })).toHaveAttribute(
      'href',
      expect.stringMatching(
        /^\/profiles\/profile-1\/edit\?returnTo=%2Fconfigure%3Ftype%3Dinterviewer%26draft%3D.+%26step%3Djobbs%C3%B8ker$/,
      ),
    );
    await user.click(screen.getByRole('button', { name: 'Slett Profil A' }));
    await user.click(screen.getByRole('button', { name: 'Slett' }));

    await waitFor(() =>
      expect(screen.queryByRole('radio', { name: /Profil A/ })).not.toBeInTheDocument(),
    );
    expect(fetchMock).toHaveBeenCalledWith('/api/profiles/profile-1', { method: 'DELETE' });
  });

  it('links to a new profile from the profile step', async () => {
    const user = await openAsInterviewer();

    await skipTemplate(user);

    expect(screen.getByRole('link', { name: 'Lag en ny jobbsøkermal' })).toHaveAttribute(
      'href',
      expect.stringMatching(
        /^\/profiles\/new\?returnTo=%2Fconfigure%3Ftype%3Dinterviewer%26draft%3D.+%26step%3Djobbs%C3%B8ker$/,
      ),
    );
    const skip = screen.getByRole('button', { name: 'Fortsett uten jobbsøkermal' });
    const practice = screen.getByRole('group', { name: 'Dette vil jobbsøkeren øve på' });
    expect(skip.compareDocumentPosition(practice) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('saves an unfinished draft and goes to the agents page', async () => {
    const user = await openAsInterviewer();
    const draft = screen.getByRole('button', { name: 'Lagre utkast' });
    const next = screen.getByRole('button', { name: 'Neste' });
    expect(draft.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole('complementary', { name: 'Seksjoner' })).not.toContainElement(draft);
    await user.click(draft);

    expect(screen.queryByRole('dialog', { name: 'Forlate uten å lagre?' })).not.toBeInTheDocument();
    await waitFor(() => expect(push).toHaveBeenCalledWith('/browse-agents'));
    expect(localStorage.getItem('kfi-configure-draft')).toContain('Barnehageassistent');
    expect(sessionStorage.getItem('kfi-agents-flash')).toBe('utkast-lagret');
  });

  it('asks before leaving the wizard without saving', async () => {
    const user = await openAsInterviewer();

    await user.click(screen.getByRole('link', { name: 'Agenter' }));
    const dialog = await screen.findByRole('dialog', { name: 'Forlate uten å lagre?' });
    expect(dialog).toBeVisible();
    expect(push).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Avbryt' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('heading', { level: 2, name: 'Velg en intervjuermal' })).toBeVisible();

    await user.click(screen.getByRole('link', { name: 'Agenter' }));
    await user.click(await screen.findByRole('button', { name: 'Forlat' }));
    expect(push).toHaveBeenCalledWith('/browse-agents');
  });

  it('restores unfinished progress from local storage', async () => {
    localStorage.setItem(
      'kfi-configure-draft',
      JSON.stringify({
        version: 1,
        agentTypeId: 'interviewer',
        wizardStep: 1,
        furthestStep: 1,
        workplace: {
          jobTitle: 'Barnehageassistent',
          templateId: 'helsefagarbeider',
          industry: 'Helse og omsorg',
          sector: 'offentlig',
          company: '',
        },
        hasTemplateChoice: false,
        template: null,
        profileId: '',
        practiceAreas: [],
        otherOpen: false,
        otherPractice: '',
        settings: {
          interviewType: null,
          difficulty: null,
          questionCount: null,
          questionCountDetail: '',
          followUp: null,
          ownQuestions: '',
          extra: '',
          model: 'openai/gpt-oss-120b',
          temperature: 0.7,
          customPrompt: null,
        },
        avatar: null,
        nameEdited: false,
        agentName: '',
        presetsDone: false,
      }),
    );

    await renderPage('interviewer');

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Velg en intervjuermal' }),
    ).toBeVisible();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Stilling og arbeidsplass' }));
    expect(screen.getByRole('textbox', { name: /Stilling/ })).toHaveValue('Barnehageassistent');
  });

  it('starts an empty wizard from Ny agent even when an utkast exists', async () => {
    localStorage.setItem(
      'kfi-configure-draft',
      JSON.stringify({
        version: 2,
        agentTypeId: 'interviewer',
        wizardStep: 1,
        furthestStep: 1,
        workplace: {
          jobTitle: 'Barnehageassistent',
          templateId: 'helsefagarbeider',
          industry: 'Helse og omsorg',
          sector: 'offentlig',
          company: '',
        },
        hasTemplateChoice: false,
        template: null,
        profileId: '',
        practiceAreas: [],
        otherOpen: false,
        otherPractice: '',
        settings: {
          interviewType: null,
          difficulty: null,
          questionCount: null,
          questionCountDetail: '',
          followUp: null,
          ownQuestions: '',
          extra: '',
          model: 'openai/gpt-oss-120b',
          temperature: 0.7,
          customPrompt: null,
        },
        avatar: null,
        nameEdited: false,
        agentName: '',
        presetsDone: false,
      }),
    );

    await renderPage('interviewer', undefined, { startNew: true });

    expect(
      screen.getByRole('heading', { level: 2, name: 'Hvilken stilling skal jobbsøkeren øve til?' }),
    ).toBeVisible();
    expect(screen.getByRole('textbox', { name: /Stilling/ })).toHaveValue('');
    expect(
      screen.queryByRole('heading', { name: 'Velg en intervjuermal' }),
    ).not.toBeInTheDocument();
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem('kfi-configure-draft') ?? '{}') as {
        version?: number;
        drafts?: { workplace: { jobTitle: string } }[];
      };
      expect(stored.version).toBe(3);
      expect(stored.drafts?.map((item) => item.workplace.jobTitle).sort()).toEqual([
        '',
        'Barnehageassistent',
      ]);
    });
  });

  it('sets a Norwegian tab title', () => {
    expect(metadata.title).toBe('Sett opp en agent');
  });
});
