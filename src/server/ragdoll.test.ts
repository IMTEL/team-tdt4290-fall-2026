// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  askAgent,
  deleteAgent,
  fetchFullAgent,
  isAgentOwner,
  listAgents,
  RagdollError,
  saveAgent,
  updateAgent,
  type NewRagdollAgent,
} from './ragdoll';

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

const BACKEND_URL = 'http://ragdoll.local';
const SESSION_TOKEN = 'session-token-abc';

const newAgent: NewRagdollAgent = {
  name: 'Butikksjef',
  description: '{}',
  prompt: 'Du er en intervjuer.',
  roles: [
    { name: 'Butikksjef', description: 'Intervjuer', document_access: [], function_access: [] },
  ],
  llm_provider: 'idun',
  llm_model: 'openai/gpt-oss-120b',
  llm_api_key: 'idun-key',
  embedding_model: 'idun:Qwen/Qwen3-Embedding-8B',
  embedding_api_key: 'idun-key',
  context_aware_retrieval: false,
  last_updated: '2026-10-01T08:00:00.000Z',
};

describe('saveAgent', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubEnv('BACKEND_API_URL', BACKEND_URL);
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('creates the agent as the logged-in user and returns the new id', async () => {
    fetchMock.mockResolvedValue(Response.json({ ...newAgent, id: 'new-agent-1' }));

    await expect(saveAgent(SESSION_TOKEN, newAgent)).resolves.toBe('new-agent-1');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BACKEND_URL}/update-agent/`);
    expect(init?.method).toBe('POST');
    expect((init?.headers as Record<string, string>).Authorization).toBe(`Bearer ${SESSION_TOKEN}`);
    expect(JSON.parse(init?.body as string)).toEqual(newAgent);
  });

  it('throws an unauthorized error when the session has expired (401)', async () => {
    fetchMock.mockResolvedValue(new Response('Signature has expired', { status: 401 }));

    await expect(saveAgent(SESSION_TOKEN, newAgent)).rejects.toMatchObject({
      kind: 'unauthorized',
    });
  });

  it('throws an unauthorized error when the token is missing or broken (422)', async () => {
    fetchMock.mockResolvedValue(new Response('Not enough segments', { status: 422 }));

    await expect(saveAgent(SESSION_TOKEN, newAgent)).rejects.toMatchObject({
      kind: 'unauthorized',
    });
  });

  it('throws a bad-response error when RAGdoll returns no id', async () => {
    fetchMock.mockResolvedValue(Response.json({ name: 'Butikksjef' }));

    await expect(saveAgent(SESSION_TOKEN, newAgent)).rejects.toMatchObject({
      kind: 'bad-response',
    });
  });

  it('throws a config error and never calls RAGdoll when the URL is missing', async () => {
    vi.stubEnv('BACKEND_API_URL', '');

    await expect(saveAgent(SESSION_TOKEN, newAgent)).rejects.toBeInstanceOf(RagdollError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('listAgents', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubEnv('BACKEND_API_URL', BACKEND_URL);
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('returns only the safe fields, never the API keys', async () => {
    // RAGdoll sends the owner the decrypted keys along with everything else.
    fetchMock.mockResolvedValue(Response.json([{ ...newAgent, id: 'agent-1' }]));

    const agents = await listAgents(SESSION_TOKEN);

    expect(agents).toEqual([
      {
        id: 'agent-1',
        name: 'Butikksjef',
        description: '{}',
        lastUpdated: '2026-10-01T08:00:00.000Z',
      },
    ]);
    expect(JSON.stringify(agents)).not.toContain('idun-key');
  });

  it('throws a bad-response error when RAGdoll does not return a list', async () => {
    fetchMock.mockResolvedValue(Response.json({ detail: 'oops' }));

    await expect(listAgents(SESSION_TOKEN)).rejects.toMatchObject({ kind: 'bad-response' });
  });
});

describe('fetchFullAgent', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubEnv('BACKEND_API_URL', BACKEND_URL);
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('returns the whole agent, with every field RAGdoll sent', async () => {
    const stored = { ...newAgent, id: 'agent-1', llm_temperature: 0.2 };
    fetchMock.mockResolvedValue(Response.json([{ ...newAgent, id: 'agent-0' }, stored]));

    await expect(fetchFullAgent(SESSION_TOKEN, 'agent-1')).resolves.toEqual(stored);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BACKEND_URL}/agents/`);
    expect((init?.headers as Record<string, string>).Authorization).toBe(`Bearer ${SESSION_TOKEN}`);
  });

  it('throws a not-found error when the user has no agent with that id', async () => {
    fetchMock.mockResolvedValue(Response.json([{ ...newAgent, id: 'agent-0' }]));

    await expect(fetchFullAgent(SESSION_TOKEN, 'agent-1')).rejects.toMatchObject({
      kind: 'not-found',
    });
  });

  it('throws a bad-response error when RAGdoll does not return a list', async () => {
    fetchMock.mockResolvedValue(Response.json({ detail: 'oops' }));

    await expect(fetchFullAgent(SESSION_TOKEN, 'agent-1')).rejects.toMatchObject({
      kind: 'bad-response',
    });
  });
});

describe('updateAgent', () => {
  const fetchMock = vi.fn<typeof fetch>();
  const existing = { ...newAgent, id: 'agent-1', llm_temperature: 0.2 };

  beforeEach(() => {
    vi.stubEnv('BACKEND_API_URL', BACKEND_URL);
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('sends the whole agent with its id, but without the keys', async () => {
    fetchMock.mockResolvedValue(Response.json(existing));

    await updateAgent(SESSION_TOKEN, existing);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BACKEND_URL}/update-agent/`);
    expect(init?.method).toBe('POST');
    const body = JSON.parse(init?.body as string);
    expect(body).toMatchObject({ id: 'agent-1', llm_temperature: 0.2, name: 'Butikksjef' });
    expect(body.llm_api_key).toBe('');
    expect(body.embedding_api_key).toBe('');
  });

  it('returns the saved agent without the keys', async () => {
    // RAGdoll answers the owner with the decrypted keys.
    fetchMock.mockResolvedValue(Response.json(existing));

    const saved = await updateAgent(SESSION_TOKEN, existing);

    expect(saved).toEqual({
      id: 'agent-1',
      name: 'Butikksjef',
      description: '{}',
      lastUpdated: '2026-10-01T08:00:00.000Z',
    });
    expect(JSON.stringify(saved)).not.toContain('idun-key');
  });

  it('throws a bad-response error when RAGdoll returns no id', async () => {
    fetchMock.mockResolvedValue(Response.json({ name: 'Butikksjef' }));

    await expect(updateAgent(SESSION_TOKEN, existing)).rejects.toMatchObject({
      kind: 'bad-response',
    });
  });
});

describe('isAgentOwner', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubEnv('BACKEND_API_URL', BACKEND_URL);
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it.each([true, false])('returns %s when RAGdoll says is_owner is %s', async (isOwner) => {
    fetchMock.mockResolvedValue(Response.json({ is_owner: isOwner, collaborators: [] }));

    await expect(isAgentOwner(SESSION_TOKEN, 'agent-1')).resolves.toBe(isOwner);

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BACKEND_URL}/agents/agent-1/collaborators`);
  });

  it('throws a bad-response error when RAGdoll does not say who owns the agent', async () => {
    fetchMock.mockResolvedValue(Response.json({ collaborators: [] }));

    await expect(isAgentOwner(SESSION_TOKEN, 'agent-1')).rejects.toMatchObject({
      kind: 'bad-response',
    });
  });
});

describe('deleteAgent', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubEnv('BACKEND_API_URL', BACKEND_URL);
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('deletes the agent as the logged-in user, and accepts the null RAGdoll answers with', async () => {
    fetchMock.mockResolvedValue(Response.json(null));

    await expect(deleteAgent(SESSION_TOKEN, 'agent-1')).resolves.toBeUndefined();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BACKEND_URL}/delete-agent?agent_id=agent-1`);
    expect(init?.method).toBeUndefined(); // RAGdoll deletes with a GET.
    expect((init?.headers as Record<string, string>).Authorization).toBe(`Bearer ${SESSION_TOKEN}`);
  });

  it('throws an unreachable error when RAGdoll fails to delete', async () => {
    fetchMock.mockResolvedValue(new Response('Internal Server Error', { status: 500 }));

    await expect(deleteAgent(SESSION_TOKEN, 'agent-1')).rejects.toMatchObject({
      kind: 'unreachable',
    });
  });
});
