import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { getAgentType } from '@/domain/agentTypes/registry';
import { toStoredDescription } from '@/domain/agentTypes/storedAnswers';
import type { Agent } from '@/lib/types';
import { fetchAgents } from './api';
import { AgentList } from './AgentList';

vi.mock('./api', () => ({ fetchAgents: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

const fetchAgentsMock = vi.mocked(fetchAgents);

function makeAgent(fields: Partial<Agent> = {}): Agent {
  return {
    id: 'agent-1',
    name: 'Intervjuer for Barnehagelærer',
    description: '{"stilling":"Barnehagelærer"}',
    lastUpdated: '2026-10-02T12:00:00.000Z',
    llmModel: 'openai/gpt-oss-120b',
    temperature: 0.7,
    prompt: 'Du er en intervjuer.',
    type: 'interviewer',
    typeLabel: 'Intervjuer',
    stilling: 'Barnehagelærer',
    bransje: 'Oppvekst',
    vanskelighetsgrad: 'lett',
    intervjuer: 'styrer, vennlig',
    intervjutype: 'første intervju',
    ...fields,
  };
}

/** The names of the cards in a section, in the order they are shown. */
function cardNames(section: HTMLElement): string[] {
  return within(section)
    .getAllByRole('heading', { level: 3 })
    .map((heading) => heading.textContent ?? '');
}

describe('AgentList', () => {
  afterEach(() => {
    fetchAgentsMock.mockReset();
    sessionStorage.clear();
    localStorage.clear();
  });

  it('says it is loading until the list arrives', async () => {
    fetchAgentsMock.mockResolvedValue([]);

    render(<AgentList />);

    expect(screen.getByText('Laster agenter …')).toBeVisible();
    expect(await screen.findByRole('button', { name: /Ny agent/ })).toBeVisible();
  });

  it('shows Ny agent as the first interviewer card when there are no agents', async () => {
    fetchAgentsMock.mockResolvedValue([]);

    render(<AgentList />);

    const heading = await screen.findByRole('heading', { level: 2, name: 'Intervjuer' });
    expect(cardNames(heading.closest('section')!)).toEqual(['Ny agent']);
    expect(screen.getByText('Sett opp en ny intervjuer')).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Sett opp en agent' })).not.toBeInTheDocument();
  });

  it('shows an error instead of the empty state when the list cannot be loaded', async () => {
    fetchAgentsMock.mockRejectedValue(new Error('Noe gikk galt. Prøv igjen.'));

    render(<AgentList />);

    expect(await screen.findByText('Noe gikk galt. Prøv igjen.')).toBeVisible();
    expect(screen.queryByRole('button', { name: /Ny agent/ })).not.toBeInTheDocument();
  });

  it('shows each agent as a card with the interviewer and one sentence', async () => {
    fetchAgentsMock.mockResolvedValue([makeAgent()]);

    render(<AgentList />);

    expect(
      await screen.findByRole('heading', { name: 'Intervjuer for Barnehagelærer' }),
    ).toBeVisible();
    expect(screen.getByText('Styrer, vennlig')).toBeVisible();
    expect(screen.getByText('Første intervju.')).toBeVisible();
    // No table any more.
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();
  });

  it('shows each agent’s own avatar, and the default image for one without', async () => {
    fetchAgentsMock.mockResolvedValue([
      makeAgent({ id: 'a', name: 'Med avatar', avatar: 'katt' }),
      makeAgent({ id: 'b', name: 'Uten avatar', avatar: null }),
    ]);

    render(<AgentList />);

    const sourceOf = async (name: string) =>
      (await screen.findByRole('link', { name: new RegExp(name) })).querySelector('img');
    expect(await sourceOf('Med avatar')).toHaveAttribute('src', '/avatars/katt.svg');
    expect(await sourceOf('Uten avatar')).toHaveAttribute('src', '/avatars/default.svg');
  });

  it('links each card to the agent’s page and its test button to the test chat', async () => {
    fetchAgentsMock.mockResolvedValue([makeAgent()]);

    render(<AgentList />);

    const card = await screen.findByRole('link', { name: /Intervjuer for Barnehagelærer/ });
    expect(card).toHaveAttribute('href', '/browse-agents/agent-1');
    expect(screen.getByRole('link', { name: 'Test agenten' })).toHaveAttribute(
      'href',
      '/test-chat?agent=agent-1',
    );
  });

  it('puts agents of each type in their own section, and unreadable ones last', async () => {
    fetchAgentsMock.mockResolvedValue([
      makeAgent({ id: 'other', name: 'Fra RAGdoll', type: null, typeLabel: null }),
      makeAgent({ id: 'interviewer', name: 'Butikksjef Kari' }),
    ]);

    render(<AgentList />);

    await screen.findByText('Butikksjef Kari');
    const headings = screen.getAllByRole('heading', { level: 2 });
    expect(headings.map((heading) => heading.textContent)).toEqual(['Intervjuer', 'Andre agenter']);

    const [interviewers, others] = headings.map((heading) => heading.closest('section')!);
    expect(cardNames(interviewers)).toEqual(['Ny agent', 'Butikksjef Kari']);
    expect(cardNames(others)).toEqual(['Fra RAGdoll']);
  });

  it('shows the newest agent first within a section', async () => {
    fetchAgentsMock.mockResolvedValue([
      makeAgent({ id: 'old', name: 'Gammel', lastUpdated: '2026-09-01T08:00:00.000Z' }),
      makeAgent({ id: 'new', name: 'Ny', lastUpdated: '2026-10-05T08:00:00.000Z' }),
    ]);

    render(<AgentList />);

    const heading = await screen.findByRole('heading', { level: 2, name: 'Intervjuer' });
    expect(cardNames(heading.closest('section')!)).toEqual(['Ny agent', 'Ny', 'Gammel']);
  });

  it('shows Agent lagret when opened after a save', async () => {
    sessionStorage.setItem('kfi-agents-flash', 'agent-lagret');
    fetchAgentsMock.mockResolvedValue([]);

    render(<AgentList />);

    expect(await screen.findByText('Agent lagret')).toBeVisible();
    expect(sessionStorage.getItem('kfi-agents-flash')).toBeNull();
  });

  const draftJson = JSON.stringify({
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
  });

  it('shows a local draft as an utkast card', async () => {
    localStorage.setItem('kfi-configure-draft', draftJson);
    fetchAgentsMock.mockResolvedValue([]);

    render(<AgentList />);

    const heading = await screen.findByRole('heading', { level: 2, name: 'Intervjuer' });
    expect(cardNames(heading.closest('section')!)).toEqual([
      'Ny agent',
      'Intervjuer for Barnehageassistent',
    ]);
    expect(screen.getByText('Utkast')).toBeVisible();
    expect(screen.getByRole('link', { name: /Intervjuer for Barnehageassistent/ })).toHaveAttribute(
      'href',
      '/configure?type=interviewer',
    );
  });

  it('can delete the local draft from the utkast card', async () => {
    localStorage.setItem('kfi-configure-draft', draftJson);
    fetchAgentsMock.mockResolvedValue([]);
    const user = userEvent.setup();

    render(<AgentList />);

    await user.click(
      await screen.findByRole('button', {
        name: 'Slett utkastet Intervjuer for Barnehageassistent',
      }),
    );
    expect(
      screen.getByRole('dialog', { name: 'Slette utkastet «Intervjuer for Barnehageassistent»?' }),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Slett' }));

    expect(localStorage.getItem('kfi-configure-draft')).toBeNull();
    expect(
      screen.queryByRole('heading', { name: 'Intervjuer for Barnehageassistent' }),
    ).not.toBeInTheDocument();
  });

  describe('search', () => {
    // The search reads the answers from the description.
    const interviewer = getAgentType('interviewer')!;
    const agents = [
      makeAgent({
        id: 'kindergarten',
        name: 'Intervjuer for Barnehagelærer',
        description: toStoredDescription(interviewer, {
          stilling: 'Barnehagelærer',
          vanskelighetsgrad: 'lett',
        }),
      }),
      makeAgent({
        id: 'shop',
        name: 'Butikksjef Kari',
        description: toStoredDescription(interviewer, {
          stilling: 'Butikkmedarbeider',
          bransje: 'Varehandel (privat)',
          vanskelighetsgrad: 'krevende',
        }),
      }),
    ];

    it('shows only the agents that match, without Ny agent and the utkast', async () => {
      localStorage.setItem('kfi-configure-draft', draftJson);
      fetchAgentsMock.mockResolvedValue(agents);
      const user = userEvent.setup();

      render(<AgentList />);

      await user.click(await screen.findByRole('searchbox', { name: 'Søk i agenter' }));
      await user.paste('butikk krevende');

      const heading = screen.getByRole('heading', { level: 2, name: 'Intervjuer' });
      expect(cardNames(heading.closest('section')!)).toEqual(['Butikksjef Kari']);
      expect(screen.queryByRole('button', { name: /Ny agent/ })).not.toBeInTheDocument();
      expect(screen.queryByText('Utkast')).not.toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('1 agent funnet');
    });

    it('says when no agent matches, and can clear the search', async () => {
      fetchAgentsMock.mockResolvedValue(agents);
      const user = userEvent.setup();

      render(<AgentList />);

      await user.click(await screen.findByRole('searchbox', { name: 'Søk i agenter' }));
      await user.paste('sykepleier');

      expect(screen.getByText('Ingen agenter passer søket eller filtrene.')).toBeVisible();
      expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('0 agenter funnet');

      await user.click(screen.getByRole('button', { name: 'Nullstill søk og filtre' }));

      const search = screen.getByRole('searchbox', { name: 'Søk i agenter' });
      expect(search).toHaveValue('');
      // The button is gone, so focus goes back to the search field.
      expect(search).toHaveFocus();
      const heading = screen.getByRole('heading', { level: 2, name: 'Intervjuer' });
      expect(cardNames(heading.closest('section')!)).toEqual([
        'Ny agent',
        'Intervjuer for Barnehagelærer',
        'Butikksjef Kari',
      ]);
    });

    it('has no search field while loading or after an error', async () => {
      fetchAgentsMock.mockRejectedValue(new Error('Noe gikk galt. Prøv igjen.'));

      render(<AgentList />);

      expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
      expect(await screen.findByText('Noe gikk galt. Prøv igjen.')).toBeVisible();
      expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    });
  });

  describe('filters', () => {
    const agents = [
      makeAgent({
        id: 'kindergarten',
        name: 'Intervjuer for Barnehagelærer',
        bransje: 'Oppvekst og utdanning (offentlig)',
        vanskelighetsgrad: 'lett',
        intervjutype: 'første intervju',
      }),
      makeAgent({
        id: 'nurse',
        name: 'Intervjuer for Sykepleier',
        bransje: 'Helse og omsorg (offentlig) | Om bransjen: Turnus.',
        vanskelighetsgrad: 'krevende | Antall spørsmål: 6–8',
        intervjutype: 'andre intervju',
      }),
      makeAgent({
        id: 'shop',
        name: 'Butikksjef Kari',
        bransje: 'Varehandel (privat)',
        vanskelighetsgrad: 'krevende',
        intervjutype: 'første intervju',
      }),
    ];

    /** Opens the filter with this label and picks the choice. */
    async function choose(user: ReturnType<typeof userEvent.setup>, filter: string, label: string) {
      await user.click(screen.getByRole('combobox', { name: filter }));
      await user.click(screen.getByRole('option', { name: label }));
    }

    function shownNames(): string[] {
      const heading = screen.getByRole('heading', { level: 2, name: 'Intervjuer' });
      return cardNames(heading.closest('section')!);
    }

    it('offers only the industries and difficulties the agents have', async () => {
      fetchAgentsMock.mockResolvedValue(agents);
      const user = userEvent.setup();

      render(<AgentList />);

      await user.click(await screen.findByRole('combobox', { name: 'Bransje' }));
      expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
        'Alle',
        'Helse og omsorg',
        'Oppvekst og utdanning',
        'Varehandel',
      ]);
      await user.keyboard('{Escape}');

      await user.click(screen.getByRole('combobox', { name: 'Vanskelighetsgrad' }));
      expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
        'Alle',
        'Lett',
        'Krevende',
      ]);
    });

    it('combines the filters, and hides Ny agent while filtering', async () => {
      fetchAgentsMock.mockResolvedValue(agents);
      const user = userEvent.setup();

      render(<AgentList />);

      await screen.findByRole('combobox', { name: 'Sektor' });
      await choose(user, 'Sektor', 'Offentlig');
      expect(shownNames()).toEqual(['Intervjuer for Barnehagelærer', 'Intervjuer for Sykepleier']);
      expect(screen.queryByRole('button', { name: /Ny agent/ })).not.toBeInTheDocument();

      await choose(user, 'Vanskelighetsgrad', 'Krevende');
      expect(shownNames()).toEqual(['Intervjuer for Sykepleier']);
      expect(screen.getByRole('status')).toHaveTextContent('1 agent funnet');

      await choose(user, 'Intervjutype', 'Andre intervju');
      await choose(user, 'Rolle', 'Intervjuer');
      expect(shownNames()).toEqual(['Intervjuer for Sykepleier']);
    });

    it('combines the filters with the search', async () => {
      fetchAgentsMock.mockResolvedValue(agents);
      const user = userEvent.setup();

      render(<AgentList />);

      await user.click(await screen.findByRole('searchbox', { name: 'Søk i agenter' }));
      await user.paste('intervjuer');
      await choose(user, 'Bransje', 'Oppvekst og utdanning');

      expect(shownNames()).toEqual(['Intervjuer for Barnehagelærer']);
    });

    it('resets every filter with one button', async () => {
      fetchAgentsMock.mockResolvedValue(agents);
      const user = userEvent.setup();

      render(<AgentList />);

      const reset = await screen.findByRole('button', { name: 'Nullstill filtre' });
      expect(reset).toBeDisabled();

      await choose(user, 'Sektor', 'Privat');
      await choose(user, 'Intervjutype', 'Første intervju');
      expect(shownNames()).toEqual(['Butikksjef Kari']);

      await user.click(reset);

      expect(reset).toBeDisabled();
      expect(screen.getByRole('combobox', { name: 'Sektor' })).toHaveTextContent('Alle');
      expect(shownNames()).toEqual([
        'Ny agent',
        'Intervjuer for Barnehagelærer',
        'Intervjuer for Sykepleier',
        'Butikksjef Kari',
      ]);
    });

    it('says when no agent matches the filters', async () => {
      fetchAgentsMock.mockResolvedValue(agents);
      const user = userEvent.setup();

      render(<AgentList />);

      await screen.findByRole('combobox', { name: 'Sektor' });
      await choose(user, 'Sektor', 'Privat');
      await choose(user, 'Vanskelighetsgrad', 'Lett');

      expect(screen.getByText('Ingen agenter passer søket eller filtrene.')).toBeVisible();
      expect(screen.getByRole('status')).toHaveTextContent('0 agenter funnet');

      await user.click(screen.getByRole('button', { name: 'Nullstill søk og filtre' }));

      expect(screen.getByRole('button', { name: 'Nullstill filtre' })).toBeDisabled();
      expect(shownNames()).toHaveLength(4);
    });

    it('turns off a filter no agent has an answer for', async () => {
      fetchAgentsMock.mockResolvedValue([makeAgent({ bransje: null })]);

      render(<AgentList />);

      expect(await screen.findByRole('combobox', { name: 'Bransje' })).toHaveAttribute(
        'aria-disabled',
        'true',
      );
      expect(screen.getByRole('combobox', { name: 'Sektor' })).toHaveAttribute(
        'aria-disabled',
        'true',
      );
    });
  });
});
