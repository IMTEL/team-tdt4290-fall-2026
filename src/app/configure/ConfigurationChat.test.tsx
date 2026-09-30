import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { sendToAgent } from '@/components/chat/sendToAgent';
import { ConfigurationChat } from './ConfigurationChat';

// The chat itself is tested in AgentChat.test.tsx. Here we only check what this page chooses:
// the greeting and which agent answers.
vi.mock('@/components/chat/sendToAgent', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/chat/sendToAgent')>()),
  sendToAgent: vi.fn(),
}));
const sendMock = vi.mocked(sendToAgent);

describe('ConfigurationChat', () => {
  afterEach(() => {
    sendMock.mockReset();
  });

  it('opens with the assistant asking about the job', () => {
    render(<ConfigurationChat />);

    expect(screen.getByText(/Hvilken stilling skal jobbsøkeren øve til\?/)).toBeInTheDocument();
  });

  it('sends the conversation, greeting included, to the configurator agent', async () => {
    sendMock.mockResolvedValue('Neste spørsmål');
    const user = userEvent.setup();
    render(<ConfigurationChat />);

    await user.type(screen.getByRole('textbox', { name: 'Melding' }), 'Butikkmedarbeider{Enter}');
    await screen.findByText('Neste spørsmål');

    const [agent, history] = sendMock.mock.calls[0];
    expect(agent).toBe('configurator');
    expect(history.map(({ role, content }) => ({ role, content }))).toEqual([
      { role: 'assistant', content: expect.stringContaining('Hei!') },
      { role: 'user', content: 'Butikkmedarbeider' },
    ]);
  });
});
