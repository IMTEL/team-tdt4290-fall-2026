import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { cloneAgent, fetchAgents, updateAgent } from '../../api';
import { CloneAgent } from './CloneAgent';

const notFound = vi.hoisted(() => vi.fn());
const push = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({ notFound, useRouter: () => ({ push }) }));
vi.mock('../../api', () => ({ fetchAgents: vi.fn(), cloneAgent: vi.fn(), updateAgent: vi.fn() }));

const fetchAgentsMock = vi.mocked(fetchAgents);
const cloneAgentMock = vi.mocked(cloneAgent);
const updateAgentMock = vi.mocked(updateAgent);

const answers = {
  stilling: 'Barnehagelærer',
  bransje: 'Barnehage (offentlig)',
  bedrift: 'Ingen navn',
  intervjutype: 'første intervju',
  intervjuer: 'leder, vennlig',
  jobbsoker: 'under 25, lite erfaring',
  vanskelighetsgrad: 'lett',
  egneSporsmal: 'ingen',
};

const agent = {
  id: 'agent-1',
  name: 'Intervjuer for Barnehagelærer',
  description: JSON.stringify({ type: 'interviewer', version: 1, answers }),
  lastUpdated: '2026-10-02T12:00:00.000Z',
  llmModel: 'openai/gpt-oss-120b',
  temperature: 0.7,
  prompt: 'Du er en intervjuer.',
};

const field = (label: string) => screen.getByRole('textbox', { name: new RegExp(`^${label}`) });

describe('CloneAgent', () => {
  afterEach(() => {
    fetchAgentsMock.mockReset();
    cloneAgentMock.mockReset();
    updateAgentMock.mockReset();
    push.mockReset();
    notFound.mockClear();
  });

  it('fills the form from the agent, with "(kopi)" after the name', async () => {
    fetchAgentsMock.mockResolvedValue([agent]);

    render(<CloneAgent agentId="agent-1" />);

    expect(await screen.findByRole('heading', { name: 'Klon agent' })).toBeVisible();
    expect(field('Navn')).toHaveValue('Intervjuer for Barnehagelærer (kopi)');
    expect(field('Stilling')).toHaveValue('Barnehagelærer');
  });

  it('saves a new agent and goes to it, without changing the original', async () => {
    fetchAgentsMock.mockResolvedValue([agent]);
    cloneAgentMock.mockResolvedValue('agent-2');
    const user = userEvent.setup();

    render(<CloneAgent agentId="agent-1" />);
    await user.click(await screen.findByRole('button', { name: 'Lagre som ny agent' }));

    // Unchanged advanced settings are not sent, so the clone gets the original's.
    expect(cloneAgentMock).toHaveBeenCalledWith(
      'agent-1',
      'Intervjuer for Barnehagelærer (kopi)',
      answers,
      undefined,
    );
    expect(updateAgentMock).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith('/browse-agents/agent-2');
  });

  it('cancels back to the original agent', async () => {
    fetchAgentsMock.mockResolvedValue([agent]);

    render(<CloneAgent agentId="agent-1" />);

    expect(await screen.findByRole('link', { name: 'Avbryt' })).toHaveAttribute(
      'href',
      '/browse-agents/agent-1',
    );
  });

  it('cannot clone an agent that was not made in this app', async () => {
    fetchAgentsMock.mockResolvedValue([{ ...agent, description: 'En vanlig beskrivelse' }]);

    render(<CloneAgent agentId="agent-1" />);

    expect(await screen.findByText(/kan ikke klones/)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Lagre som ny agent' })).not.toBeInTheDocument();
  });

  it('calls notFound when the id is not in the list', async () => {
    fetchAgentsMock.mockResolvedValue([agent]);

    render(<CloneAgent agentId="missing" />);

    await waitFor(() => expect(notFound).toHaveBeenCalled());
  });
});
