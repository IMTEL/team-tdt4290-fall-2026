import { render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

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
});
