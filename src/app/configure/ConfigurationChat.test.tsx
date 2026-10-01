import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { sendConfigurationTurn } from './api';
import { ConfigurationChat } from './ConfigurationChat';

// The chat itself is tested in AgentChat.test.tsx and the save form in SaveAgentForm.test.tsx.
// Here we only check what this page adds: the greeting, which route answers, and showing the
// save form once the configuration is finished.
vi.mock('./api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api')>()),
  sendConfigurationTurn: vi.fn(),
}));
const sendMock = vi.mocked(sendConfigurationTurn);

const configuration = {
  stilling: 'Butikkmedarbeider',
  bransje: 'Varehandel (privat)',
  bedrift: 'Nærbutikken AS',
  intervjutype: 'første intervju',
  intervjuer: 'butikksjef, vennlig',
  jobbsoker: 'under 25, lite erfaring',
  vanskelighetsgrad: 'lett | Antall spørsmål: 6 | Oppfølgingsspørsmål: ja',
  egneSporsmal: 'ingen',
};

async function sendMessage(text: string) {
  const user = userEvent.setup();
  await user.type(screen.getByRole('textbox', { name: 'Melding' }), `${text}{Enter}`);
}

describe('ConfigurationChat', () => {
  afterEach(() => {
    sendMock.mockReset();
  });

  it('opens with the assistant asking about the job', () => {
    render(<ConfigurationChat />);

    expect(screen.getByText(/Hvilken stilling skal jobbsøkeren øve til\?/)).toBeInTheDocument();
  });

  it('sends the conversation, greeting included, to the configurator', async () => {
    sendMock.mockResolvedValue({ reply: 'Neste spørsmål', configuration: null });
    render(<ConfigurationChat />);

    await sendMessage('Butikkmedarbeider');
    await screen.findByText('Neste spørsmål');

    const [history] = sendMock.mock.calls[0];
    expect(history.map(({ role, content }) => ({ role, content }))).toEqual([
      { role: 'assistant', content: expect.stringContaining('Hei!') },
      { role: 'user', content: 'Butikkmedarbeider' },
    ]);
  });

  it('does not offer to save before the configuration is finished', async () => {
    sendMock.mockResolvedValue({ reply: 'Neste spørsmål', configuration: null });
    render(<ConfigurationChat />);

    await sendMessage('Butikkmedarbeider');
    await screen.findByText('Neste spørsmål');

    expect(screen.queryByRole('button', { name: 'Lagre agent' })).not.toBeInTheDocument();
  });

  it('offers to save once the configurator has finished', async () => {
    sendMock.mockResolvedValue({ reply: 'Ferdig!', configuration });
    render(<ConfigurationChat />);

    await sendMessage('Ja, det stemmer');

    expect(await screen.findByRole('button', { name: 'Lagre agent' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Navn på intervjueren/ })).toHaveValue(
      'Intervjuer for Butikkmedarbeider',
    );
  });
});
