import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { sendToAgent } from '@/components/chat/sendToAgent';
import { TestChat } from './TestChat';

// The chat itself is tested in AgentChat.test.tsx. Here we only check what this page adds:
// the greeting, which agent answers, and starting over.
vi.mock('@/components/chat/sendToAgent', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/chat/sendToAgent')>()),
  sendToAgent: vi.fn(),
}));
const sendMock = vi.mocked(sendToAgent);

function setup() {
  const user = userEvent.setup();
  const view = render(<TestChat agentId="agent-1" />);
  const box = () => screen.getByRole('textbox', { name: 'Melding' });
  return { user, box, view };
}

describe('TestChat', () => {
  afterEach(() => {
    sendMock.mockReset();
  });

  it('opens with the interviewer asking the job seeker to present themselves', () => {
    setup();

    expect(screen.getByText(/fortelle litt om deg selv\?/)).toBeInTheDocument();
  });

  it('sends the conversation, greeting included, to the agent being tested', async () => {
    sendMock.mockResolvedValue('Hva i CV-en din er relevant for stillingen?');
    const { user, box } = setup();

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
    const { user, box } = setup();
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
    const { user, box } = setup();
    await user.type(box(), 'Hei{Enter}');
    const signal = sendMock.mock.calls[0][2];

    await user.click(screen.getByRole('button', { name: 'Start på nytt' }));

    expect(signal?.aborted).toBe(true);
    expect(screen.queryByText('Assistenten skriver …')).not.toBeInTheDocument();
  });

  it('starts a new conversation with the new agent when the agent changes', async () => {
    sendMock.mockResolvedValue('Hva i CV-en din er relevant for stillingen?');
    const { user, box, view } = setup();
    await user.type(box(), 'Jeg har jobbet i butikk i fem år.{Enter}');
    await screen.findByText('Hva i CV-en din er relevant for stillingen?');

    view.rerender(<TestChat agentId="agent-2" />);

    expect(screen.queryByText('Jeg har jobbet i butikk i fem år.')).not.toBeInTheDocument();
    await user.type(box(), 'Hei{Enter}');
    expect(sendMock.mock.calls.at(-1)?.[0]).toBe('agent-2');
  });
});
