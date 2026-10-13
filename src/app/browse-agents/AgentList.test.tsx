import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchAgents } from './api';
import { AgentList } from './AgentList';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('./api', () => ({ fetchAgents: vi.fn() }));

const fetchAgentsMock = vi.mocked(fetchAgents);

const agent = {
  id: 'agent-1',
  name: 'Intervjuer for Barnehagelærer',
  description: '{"stilling":"Barnehagelærer"}',
  lastUpdated: '2026-10-02T12:00:00.000Z',
  llmModel: 'openai/gpt-oss-120b',
  temperature: 0.7,
  prompt: 'Du er en intervjuer.',
};

describe('AgentList', () => {
  afterEach(() => {
    fetchAgentsMock.mockReset();
  });

  it('shows an empty state with a link to the configurator', async () => {
    fetchAgentsMock.mockResolvedValue([]);

    render(<AgentList />);

    expect(await screen.findByText(/Du har ingen agenter ennå/)).toBeVisible();
    expect(screen.getByRole('link', { name: 'Sett opp en intervjuer' })).toHaveAttribute(
      'href',
      '/configure',
    );
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();
  });

  it('shows the agent from the list', async () => {
    fetchAgentsMock.mockResolvedValue([agent]);

    render(<AgentList />);

    expect(await screen.findByText('Intervjuer for Barnehagelærer')).toBeVisible();
    expect(screen.getByText('Sist oppdatert')).toBeVisible();
    expect(screen.queryByText('Status')).not.toBeInTheDocument();
  });

  it('shows an error instead of the empty state when the list cannot be loaded', async () => {
    fetchAgentsMock.mockRejectedValue(new Error('Noe gikk galt. Prøv igjen.'));

    render(<AgentList />);

    expect(await screen.findByText('Noe gikk galt. Prøv igjen.')).toBeVisible();
    expect(screen.queryByText(/Du har ingen agenter ennå/)).not.toBeInTheDocument();
  });
});
