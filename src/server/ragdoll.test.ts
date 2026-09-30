// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { askAgent, RagdollError } from './ragdoll';

const RAGDOLL_URL = 'https://ragdoll.test/backend';
const agent = { id: 'agent-123', accessKey: 'secret-key' };
const messages = [
  { role: 'assistant' as const, content: 'Hei!' },
  { role: 'user' as const, content: 'Butikkmedarbeider' },
];

// What RAGdoll's /api/chat/ask returns: the pipeline result wrapped in `response`.
function ragdollReply(text: string) {
  return Response.json({ response: { id: 'x', model: 'm', response: text } });
}

async function askAndCatch() {
  try {
    await askAgent(agent, messages);
  } catch (error) {
    return error;
  }
  throw new Error('askAgent should have thrown');
}

describe('askAgent', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubEnv('RAGDOLL_API_URL', RAGDOLL_URL);
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('sends the history to the agent and returns only the reply text', async () => {
    fetchMock.mockResolvedValue(ragdollReply('Hei! Hvilken stilling?'));

    await expect(askAgent(agent, messages)).resolves.toBe('Hei! Hvilken stilling?');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${RAGDOLL_URL}/api/chat/ask`);
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual({
      agent_id: 'agent-123',
      access_key: 'secret-key',
      chat_log: messages,
    });
  });

  it('throws a config error and never calls RAGdoll when the API URL is missing', async () => {
    vi.stubEnv('RAGDOLL_API_URL', '');

    const error = await askAndCatch();

    expect(error).toBeInstanceOf(RagdollError);
    expect((error as RagdollError).kind).toBe('config');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws an unreachable error with RAGdoll’s answer in the message when RAGdoll fails', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ detail: 'Unauthorized, check logs' }, { status: 401 }),
    );

    const error = await askAndCatch();

    expect((error as RagdollError).kind).toBe('unreachable');
    // Kept for the server log; the route must not pass it on to the browser.
    expect((error as RagdollError).message).toContain('401');
  });

  it('throws an unreachable error when RAGdoll cannot be reached', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    const error = await askAndCatch();

    expect((error as RagdollError).kind).toBe('unreachable');
  });

  it('throws a timeout error when RAGdoll takes too long', async () => {
    fetchMock.mockRejectedValue(new DOMException('The operation timed out.', 'TimeoutError'));

    const error = await askAndCatch();

    expect((error as RagdollError).kind).toBe('timeout');
  });

  it.each([
    ['the text is not wrapped', { response: 'not the wrapped object' }],
    ['there is no text', { response: { id: 'x' } }],
  ])('throws a bad-response error when %s', async (_, body) => {
    fetchMock.mockResolvedValue(Response.json(body));

    const error = await askAndCatch();

    expect((error as RagdollError).kind).toBe('bad-response');
  });

  it('throws a bad-response error when the body is not JSON', async () => {
    fetchMock.mockResolvedValue(new Response('<html>Bad gateway</html>'));

    const error = await askAndCatch();

    expect((error as RagdollError).kind).toBe('bad-response');
  });
});
