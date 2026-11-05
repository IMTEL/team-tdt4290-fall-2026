import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AgentChat } from './AgentChat';
import { ChatError } from './sendToAgent';
import type { ChatMessage, SendMessages } from './types';

const greeting: ChatMessage[] = [{ id: 'greeting', role: 'assistant', content: 'Hei!' }];

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

// No module mocks: the fake agent is passed in, the same way the pages pass the real one.
function setup() {
  const send = vi.fn<SendMessages>();
  const user = userEvent.setup();
  const utils = render(<AgentChat send={send} initialMessages={greeting} />);
  const sentHistory = (call: number) =>
    send.mock.calls[call][0].map(({ role, content }) => ({ role, content }));
  return {
    send,
    user,
    sentHistory,
    ...utils,
    box: screen.getByRole('textbox', { name: 'Melding' }),
  };
}

describe('AgentChat', () => {
  it('shows the initial messages', () => {
    setup();

    expect(screen.getByText('Hei!')).toBeInTheDocument();
  });

  it('shows the user message, a thinking indicator, and then the reply', async () => {
    const reply = deferred<string>();
    const { send, user, box } = setup();
    send.mockReturnValue(reply.promise);

    await user.type(box, 'Butikkmedarbeider{Enter}');

    expect(screen.getByText('Butikkmedarbeider')).toBeInTheDocument();
    expect(screen.getByText('Tenker …')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();

    reply.resolve('Er arbeidsgiveren offentlig eller privat?');

    expect(
      await screen.findByText('Er arbeidsgiveren offentlig eller privat?'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Tenker …')).not.toBeInTheDocument();
  });

  it('sends the whole conversation, initial messages included', async () => {
    const { send, user, box, sentHistory } = setup();
    send.mockResolvedValue('Neste spørsmål');

    await user.type(box, 'Butikkmedarbeider{Enter}');
    await screen.findByText('Neste spørsmål');

    expect(sentHistory(0)).toEqual([
      { role: 'assistant', content: 'Hei!' },
      { role: 'user', content: 'Butikkmedarbeider' },
    ]);
  });

  it('shows the friendly error, blocks sending, and retries without repeating the message', async () => {
    const { send, user, box, sentHistory } = setup();
    send
      .mockRejectedValueOnce(new ChatError('Noe gikk galt. Prøv igjen.'))
      .mockResolvedValueOnce('Er arbeidsgiveren offentlig eller privat?');

    await user.type(box, 'Butikkmedarbeider{Enter}');

    expect(await screen.findByRole('alert')).toHaveTextContent('Noe gikk galt. Prøv igjen.');
    await user.type(box, 'Hei igjen{Enter}');
    expect(send).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Prøv igjen' }));

    expect(
      await screen.findByText('Er arbeidsgiveren offentlig eller privat?'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(sentHistory(1)).toEqual(sentHistory(0));
    expect(screen.getAllByText('Butikkmedarbeider')).toHaveLength(1);
  });

  it('never shows technical error text', async () => {
    const { send, user, box } = setup();
    send.mockRejectedValue(new Error('TypeError: x is undefined at route.ts:42'));

    await user.type(box, 'Hei{Enter}');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Noe gikk galt. Prøv igjen.');
    expect(alert).not.toHaveTextContent('route.ts');
  });

  it('cancels the pending request when the chat is left', async () => {
    const { send, user, box, unmount } = setup();
    send.mockReturnValue(new Promise(() => {}));

    await user.type(box, 'Hei{Enter}');
    const signal = send.mock.calls[0][1];
    unmount();

    expect(signal.aborted).toBe(true);
  });
});
