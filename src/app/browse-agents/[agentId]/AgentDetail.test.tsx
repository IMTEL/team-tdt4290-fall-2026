import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchAgents } from '../api';
import { AgentDetail } from './AgentDetail';

const notFound = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({ notFound }));
vi.mock('../api', () => ({ fetchAgents: vi.fn() }));

const fetchAgentsMock = vi.mocked(fetchAgents);

const agent = {
  id: 'agent-1',
  name: 'Intervjuer for Barnehagelærer',
  description: 'Stilling: Barnehagelærer',
  lastUpdated: '2026-10-02T12:00:00.000Z',
};

describe('AgentDetail', () => {
  afterEach(() => {
    fetchAgentsMock.mockReset();
    notFound.mockClear();
  });

  it('shows the name and description of the matching agent', async () => {
    fetchAgentsMock.mockResolvedValue([agent]);

    render(<AgentDetail agentId="agent-1" />);

    expect(await screen.findByRole('heading', { name: agent.name })).toBeVisible();
    expect(screen.getByText(agent.description)).toBeVisible();
  });

  it('calls notFound when the id is not in the list', async () => {
    fetchAgentsMock.mockResolvedValue([agent]);

    render(<AgentDetail agentId="missing" />);

    await waitFor(() => expect(notFound).toHaveBeenCalled());
  });
});
