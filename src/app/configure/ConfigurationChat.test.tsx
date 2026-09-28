import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChatError, sendToAgent } from '@/components/chat/sendToAgent';
import { ConfigurationChat } from './ConfigurationChat';

// Keep the real ChatError, replace only the network call.
vi.mock('@/components/chat/sendToAgent', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/chat/sendToAgent')>()),
  sendToAgent: vi.fn(),
}));
const sendMock = vi.mocked(sendToAgent);

/** A promise the test resolves or rejects by hand, to look at the UI while it is pending. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function setup() {
  const user = userEvent.setup();
  const utils = render(<ConfigurationChat />);
  return { user, ...utils, box: screen.getByRole('textbox', { name: 'Melding' }) };
}

const sentHistory = (call: number) =>
  sendMock.mock.calls[call][1].map(({ role, content }) => ({ role, content }));

describe('ConfigurationChat', () => {
  afterEach(() => {
    sendMock.mockReset();
  });

  it('opens with the assistant asking about the job', () => {
    setup();

    expect(screen.getByText(/Hvilken stilling skal jobbsøkeren øve til\?/)).toBeInTheDocument();
  });

  it('shows the user message, a typing bubble, and then the reply', async () => {
    const reply = deferred<string>();
    sendMock.mockReturnValue(reply.promise);
    const { user, box } = setup();

    await user.type(box, 'Butikkmedarbeider{Enter}');

    expect(screen.getByText('Butikkmedarbeider')).toBeInTheDocument();
    expect(screen.getByText('Assistenten skriver …')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();

    reply.resolve('Er arbeidsgiveren offentlig eller privat?');

    expect(
      await screen.findByText('Er arbeidsgiveren offentlig eller privat?'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Assistenten skriver …')).not.toBeInTheDocument();
  });

  it('sends the whole conversation, greeting included, to the configurator agent', async () => {
    sendMock.mockResolvedValue('Neste spørsmål');
    const { user, box } = setup();

    await user.type(box, 'Butikkmedarbeider{Enter}');
    await screen.findByText('Neste spørsmål');

    expect(sendMock.mock.calls[0][0]).toBe('configurator');
    expect(sentHistory(0)).toEqual([
      { role: 'assistant', content: expect.stringContaining('Hei!') },
      { role: 'user', content: 'Butikkmedarbeider' },
    ]);
  });

  it('shows the friendly error, blocks sending, and retries without repeating the message', async () => {
    sendMock
      .mockRejectedValueOnce(new ChatError('Noe gikk galt. Prøv igjen.'))
      .mockResolvedValueOnce('Er arbeidsgiveren offentlig eller privat?');
    const { user, box } = setup();

    await user.type(box, 'Butikkmedarbeider{Enter}');

    expect(await screen.findByRole('alert')).toHaveTextContent('Noe gikk galt. Prøv igjen.');
    await user.type(box, 'Hei igjen{Enter}');
    expect(sendMock).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Prøv igjen' }));

    expect(
      await screen.findByText('Er arbeidsgiveren offentlig eller privat?'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(sentHistory(1)).toEqual(sentHistory(0));
    expect(screen.getAllByText('Butikkmedarbeider')).toHaveLength(1);
  });

  it('never shows technical error text', async () => {
    sendMock.mockRejectedValue(new Error('TypeError: x is undefined at route.ts:42'));
    const { user, box } = setup();

    await user.type(box, 'Hei{Enter}');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Noe gikk galt. Prøv igjen.');
    expect(alert).not.toHaveTextContent('route.ts');
  });

  it('cancels the pending request when the page is left', async () => {
    sendMock.mockReturnValue(new Promise(() => {}));
    const { user, box, unmount } = setup();

    await user.type(box, 'Hei{Enter}');
    const signal = sendMock.mock.calls[0][2];
    unmount();

    expect(signal?.aborted).toBe(true);
  });
});
