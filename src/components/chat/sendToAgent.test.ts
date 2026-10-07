import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ChatError, sendToAgent } from './sendToAgent';
import type { ChatMessage } from './types';

const history: ChatMessage[] = [
  { id: 'greeting', role: 'assistant', content: 'Hei!' },
  { id: 'u1', role: 'user', content: 'Butikkmedarbeider' },
];

describe('sendToAgent', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('posts role and content only (no UI ids) to the agent’s chat route and returns the reply', async () => {
    fetchMock.mockResolvedValue(Response.json({ response: 'Er arbeidsgiveren offentlig?' }));

    const reply = await sendToAgent('agent-1', history);

    expect(reply).toBe('Er arbeidsgiveren offentlig?');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/agents/agent-1/chat');
    expect(JSON.parse(init?.body as string)).toEqual({
      messages: [
        { role: 'assistant', content: 'Hei!' },
        { role: 'user', content: 'Butikkmedarbeider' },
      ],
    });
  });

  it('passes the abort signal on to fetch', async () => {
    fetchMock.mockResolvedValue(Response.json({ response: 'ok' }));
    const controller = new AbortController();

    await sendToAgent('agent-1', history, controller.signal);

    expect(fetchMock.mock.calls[0][1]?.signal).toBe(controller.signal);
  });

  it.each([
    [504, 'Assistenten brukte for lang tid på å svare. Prøv igjen.'],
    [502, 'Noe gikk galt. Prøv igjen.'],
    [500, 'Noe gikk galt. Prøv igjen.'],
  ])('turns a %i into a Norwegian ChatError', async (status, userMessage) => {
    fetchMock.mockResolvedValue(Response.json({ error: 'upstream' }, { status }));

    const error = await sendToAgent('agent-1', history).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ChatError);
    expect((error as ChatError).userMessage).toBe(userMessage);
  });

  it('tells the user when the agent does not exist (404)', async () => {
    fetchMock.mockResolvedValue(Response.json({ error: 'Agent not found' }, { status: 404 }));

    const error = await sendToAgent('agent-1', history).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ChatError);
    expect((error as ChatError).userMessage).toBe('Fant ikke intervjueren. Den kan være slettet.');
  });

  it('tells the user when the server cannot be reached', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    const error = await sendToAgent('agent-1', history).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ChatError);
    expect((error as ChatError).userMessage).toMatch(/Fikk ikke kontakt med serveren/);
  });

  it('rejects a reply without text', async () => {
    fetchMock.mockResolvedValue(Response.json({ something: 'else' }));

    await expect(sendToAgent('agent-1', history)).rejects.toBeInstanceOf(ChatError);
  });

  it('rethrows the abort as is, so the caller can ignore it', async () => {
    const controller = new AbortController();
    const abortError = new DOMException('Aborted', 'AbortError');
    fetchMock.mockImplementation(async () => {
      controller.abort();
      throw abortError;
    });

    await expect(sendToAgent('agent-1', history, controller.signal)).rejects.toBe(abortError);
  });
});
