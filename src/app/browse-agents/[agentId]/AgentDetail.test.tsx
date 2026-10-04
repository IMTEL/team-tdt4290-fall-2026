import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchAgents } from '../api';
import { AgentDetail } from './AgentDetail';

const notFound = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({ notFound }));
vi.mock('../api', () => ({ fetchAgents: vi.fn() }));

const fetchAgentsMock = vi.mocked(fetchAgents);

const configuration = {
  stilling: 'Barnehagelærer',
  bransje: 'Barnehage (offentlig)',
  bedrift: 'Ingen navn, verdier omsorg og lek',
  intervjutype: 'første intervju',
  intervjuer: 'leder, vennlig',
  jobbsoker: 'under 25, lite erfaring',
  vanskelighetsgrad: 'lett',
  egneSporsmal: 'ingen',
};

const agent = {
  id: 'agent-1',
  name: 'Intervjuer for Barnehagelærer',
  description: JSON.stringify(configuration),
  lastUpdated: '2026-10-02T12:00:00.000Z',
};

describe('AgentDetail', () => {
  afterEach(() => {
    fetchAgentsMock.mockReset();
    notFound.mockClear();
  });

  it('lists the configuration and keeps the system prompt closed', async () => {
    fetchAgentsMock.mockResolvedValue([agent]);
    const user = userEvent.setup();

    render(<AgentDetail agentId="agent-1" />);

    expect(await screen.findByRole('heading', { name: agent.name })).toBeVisible();
    expect(screen.getByText('Stilling').nextElementSibling).toHaveTextContent('Barnehagelærer');
    expect(screen.getByText('Bransje').nextElementSibling).toHaveTextContent(
      'Barnehage (offentlig)',
    );
    expect(screen.queryByText(/Du er en intervjuer/)).not.toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Systemprompt' }));

    expect(screen.getByText(/Du er en intervjuer/)).toBeVisible();
    expect(screen.getByRole('link', { name: 'Test agenten' })).toHaveAttribute(
      'href',
      '/test-chat',
    );
  });

  it('calls notFound when the id is not in the list', async () => {
    fetchAgentsMock.mockResolvedValue([agent]);

    render(<AgentDetail agentId="missing" />);

    await waitFor(() => expect(notFound).toHaveBeenCalled());
  });
});
