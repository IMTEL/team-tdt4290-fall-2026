// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { POST } from './route';

const RAGDOLL_URL = 'https://ragdoll.test/backend';

function chatRequest(body: unknown) {
  return new Request('http://localhost/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const validBody = { messages: [{ role: 'user', content: 'Hei' }] };

// What RAGdoll's /api/chat/ask returns: the pipeline result wrapped in `response`.
function ragdollReply(text: string) {
  return Response.json({ response: { id: 'x', model: 'm', response: text } });
}

describe('POST /api/chat', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubEnv('RAGDOLL_API_URL', RAGDOLL_URL);
    vi.stubEnv('RAGDOLL_AGENT_ID', 'agent-123');
    vi.stubEnv('RAGDOLL_ACCESS_KEY', 'secret-key');
    vi.stubGlobal('fetch', fetchMock);
    // The route logs upstream problems on purpose; keep the test output clean.
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    fetchMock.mockReset();
  });

  it('forwards the history to RAGdoll and returns only the reply text', async () => {
    fetchMock.mockResolvedValue(ragdollReply('Hei! Hvilken stilling?'));
    const messages = [
      { role: 'assistant', content: 'Hei!' },
      { role: 'user', content: 'Butikkmedarbeider' },
    ];

    const res = await POST(chatRequest({ messages }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ response: 'Hei! Hvilken stilling?' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${RAGDOLL_URL}/api/chat/ask`);
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual({
      agent_id: 'agent-123',
      access_key: 'secret-key',
      chat_log: messages,
    });
  });

  it.each([
    ['no messages field', {}],
    ['an empty list', { messages: [] }],
    ['a message with an unknown role', { messages: [{ role: 'system', content: 'x' }] }],
    ['a message without text', { messages: [{ role: 'user' }] }],
    ['messages that are not a list', { messages: 'Hei' }],
  ])('rejects %s with 400 and never calls RAGdoll', async (_, body) => {
    const res = await POST(chatRequest(body));

    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a body that is not JSON with 400', async () => {
    const res = await POST(chatRequest('{oops'));

    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('answers 500 when the RAGdoll settings are missing', async () => {
    vi.stubEnv('RAGDOLL_ACCESS_KEY', '');

    const res = await POST(chatRequest(validBody));

    expect(res.status).toBe(500);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('answers 502 without leaking RAGdoll’s error when RAGdoll fails', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ detail: 'Unauthorized, check logs' }, { status: 401 }),
    );

    const res = await POST(chatRequest(validBody));

    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toContain('Unauthorized');
  });

  it('answers 502 when RAGdoll replies with an unexpected shape', async () => {
    fetchMock.mockResolvedValue(Response.json({ response: 'not the wrapped object' }));

    const res = await POST(chatRequest(validBody));

    expect(res.status).toBe(502);
  });

  it('answers 502 when RAGdoll cannot be reached', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    const res = await POST(chatRequest(validBody));

    expect(res.status).toBe(502);
  });

  it('answers 504 when RAGdoll takes too long', async () => {
    fetchMock.mockRejectedValue(new DOMException('The operation timed out.', 'TimeoutError'));

    const res = await POST(chatRequest(validBody));

    expect(res.status).toBe(504);
  });
});
