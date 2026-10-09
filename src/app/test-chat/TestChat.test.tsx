import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchAgents } from '@/app/browse-agents/api';
import { sendToAgent } from '@/components/chat/sendToAgent';
import { TestChat } from './TestChat';

// The chat itself is tested in AgentChat.test.tsx. Here we only check what this page adds:
// that the agent is the counsellor's, the greeting, which agent answers, and starting over.
vi.mock('@/app/browse-agents/api', () => ({ fetchAgents: vi.fn() }));
const fetchAgentsMock = vi.mocked(fetchAgents);

const myAgents = ['agent-1', 'agent-2'].map((id) => ({
  id,
  name: `Intervjuer ${id}`,
  description: '',
  lastUpdated: '2026-10-09T10:00:00Z',
}));

vi.mock('@/components/chat/sendToAgent', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/chat/sendToAgent')>()),
  sendToAgent: vi.fn(),
}));
const sendMock = vi.mocked(sendToAgent);

// Renders the chat for agent-1 and waits until the agent has been found.
async function setup() {
  const user = userEvent.setup();
  const view = render(<TestChat agentId="agent-1" />);
  await screen.findByRole('textbox', { name: 'Melding' });
  const box = () => screen.getByRole('textbox', { name: 'Melding' });
  return { user, box, view };
}

describe('TestChat', () => {
  beforeEach(() => {
    fetchAgentsMock.mockResolvedValue(myAgents);
  });

  afterEach(() => {
    sendMock.mockReset();
    fetchAgentsMock.mockReset();
  });

  it('says the interviewer was not found when it is not among the counsellor’s agents', async () => {
    // Also what an agent of another counsellor looks like: it is not in this one's list.
    render(<TestChat agentId="000000000000000000000000" />);

    expect(await screen.findByText(/Fant ikke intervjueren/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'agentene dine' })).toHaveAttribute(
      'href',
      '/browse-agents',
    );
    expect(screen.queryByRole('textbox', { name: 'Melding' })).not.toBeInTheDocument();
  });

  it('shows an error and no chat when the agents cannot be loaded', async () => {
    fetchAgentsMock.mockRejectedValue(new Error('Noe gikk galt. Prøv igjen.'));
    render(<TestChat agentId="agent-1" />);

    expect(await screen.findByText('Noe gikk galt. Prøv igjen.')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Melding' })).not.toBeInTheDocument();
  });

  it('shows no chat while the agent is being looked up', () => {
    fetchAgentsMock.mockReturnValue(new Promise(() => {}));
    render(<TestChat agentId="agent-1" />);

    expect(screen.getByText('Laster intervjueren …')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Melding' })).not.toBeInTheDocument();
  });

  it('opens with the interviewer asking the job seeker to present themselves', async () => {
    await setup();

    expect(screen.getByText(/fortelle litt om deg selv\?/)).toBeInTheDocument();
  });

  it('sends the conversation, greeting included, to the agent being tested', async () => {
    sendMock.mockResolvedValue('Hva i CV-en din er relevant for stillingen?');
    const { user, box } = await setup();

    await user.type(box(), 'Jeg har jobbet i butikk i fem år.{Enter}');
    await screen.findByText('Hva i CV-en din er relevant for stillingen?');

    const [agent, history] = sendMock.mock.calls[0];
    expect(agent).toBe('agent-1');
    expect(history.map(({ role, content }) => ({ role, content }))).toEqual([
      { role: 'assistant', content: expect.stringContaining('velkommen til intervjuet') },
      { role: 'user', content: 'Jeg har jobbet i butikk i fem år.' },
    ]);
  });

  it('goes back to the greeting when starting over', async () => {
    sendMock.mockResolvedValue('Hva i CV-en din er relevant for stillingen?');
    const { user, box } = await setup();
    await user.type(box(), 'Jeg har jobbet i butikk i fem år.{Enter}');
    await screen.findByText('Hva i CV-en din er relevant for stillingen?');

    await user.click(screen.getByRole('button', { name: 'Start på nytt' }));

    expect(screen.getByText(/fortelle litt om deg selv\?/)).toBeInTheDocument();
    expect(screen.queryByText('Jeg har jobbet i butikk i fem år.')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Hva i CV-en din er relevant for stillingen?'),
    ).not.toBeInTheDocument();
    expect(box()).toBeEnabled();
  });

  it('cancels a reply still on its way when starting over', async () => {
    sendMock.mockReturnValue(new Promise(() => {}));
    const { user, box } = await setup();
    await user.type(box(), 'Hei{Enter}');
    const signal = sendMock.mock.calls[0][2];

    await user.click(screen.getByRole('button', { name: 'Start på nytt' }));

    expect(signal?.aborted).toBe(true);
    expect(screen.queryByText('Assistenten skriver …')).not.toBeInTheDocument();
  });

  it('starts a new conversation with the new agent when the agent changes', async () => {
    sendMock.mockResolvedValue('Hva i CV-en din er relevant for stillingen?');
    const { user, box, view } = await setup();
    await user.type(box(), 'Jeg har jobbet i butikk i fem år.{Enter}');
    await screen.findByText('Hva i CV-en din er relevant for stillingen?');

    view.rerender(<TestChat agentId="agent-2" />);

    expect(screen.queryByText('Jeg har jobbet i butikk i fem år.')).not.toBeInTheDocument();
    await screen.findByRole('textbox', { name: 'Melding' });
    await user.type(box(), 'Hei{Enter}');
    expect(sendMock.mock.calls.at(-1)?.[0]).toBe('agent-2');
  });
});
