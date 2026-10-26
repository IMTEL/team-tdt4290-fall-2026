// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  askAgent,
  createFeedback,
  createProfile,
  deleteFeedback,
  deleteProfile,
  getProfile,
  listProfiles,
  updateProfile,
  askSavedAgent,
  createTemplate,
  deleteAgent,
  deleteTemplate,
  fetchFullAgent,
  getAgentRole,
  getChatAccessKey,
  getTemplate,
  getUserSettings,
  isAgentOwner,
  listAgents,
  listFeedback,
  listLanguageModels,
  listTemplates,
  publishAgent,
  RagdollError,
  saveAgent,
  saveUserSettings,
  unpublishAgent,
  updateAgent,
  updateTemplate,
  type NewRagdollAgent,
  type NewRagdollTemplate,
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

  it('sends the role as active_role_id when the agent has one', async () => {
    fetchMock.mockResolvedValue(ragdollReply('Hei!'));

    await askAgent({ ...agent, roleName: 'Butikksjef' }, messages);

    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init?.body as string)).toMatchObject({ active_role_id: 'Butikksjef' });
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

describe('askSavedAgent', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    // Different RAGdolls on purpose, like in .env.example: the configurator is on the deployed
    // one, while the user's agents are saved in the one they logged in to.
    vi.stubEnv('RAGDOLL_API_URL', RAGDOLL_URL);
    vi.stubEnv('BACKEND_API_URL', `${BACKEND_URL}/`);
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('asks the RAGdoll the agent was saved in, not the configurator’s', async () => {
    fetchMock.mockResolvedValue(ragdollReply('Hvorfor søker du?'));

    await expect(askSavedAgent({ ...agent, roleName: 'Butikksjef' }, messages)).resolves.toBe(
      'Hvorfor søker du?',
    );

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BACKEND_URL}/api/chat/ask`);
    expect(JSON.parse(init?.body as string)).toEqual({
      agent_id: 'agent-123',
      access_key: 'secret-key',
      chat_log: messages,
      active_role_id: 'Butikksjef',
    });
  });

  it('throws a config error and never calls RAGdoll when BACKEND_API_URL is missing', async () => {
    vi.stubEnv('BACKEND_API_URL', '');

    await expect(askSavedAgent(agent, messages)).rejects.toMatchObject({ kind: 'config' });
    expect(fetchMock).not.toHaveBeenCalled();
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
  llm_temperature: 0.7,
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
    expect(url).toBe(`${BACKEND_URL}/agents`);
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
        llmModel: 'openai/gpt-oss-120b',
        temperature: 0.7,
        prompt: 'Du er en intervjuer.',
        isPublished: false,
        publicName: '',
        publicDescription: '',
      },
    ]);
    expect(JSON.stringify(agents)).not.toContain('idun-key');
  });

  it('passes on whether the agent is published to The Candidate', async () => {
    fetchMock.mockResolvedValue(
      Response.json([
        {
          ...newAgent,
          id: 'agent-1',
          is_published: true,
          public_name: 'Kari',
          public_description: 'Øv på intervju',
        },
      ]),
    );

    const [summary] = await listAgents(SESSION_TOKEN);

    expect(summary).toMatchObject({
      isPublished: true,
      publicName: 'Kari',
      publicDescription: 'Øv på intervju',
    });
  });

  it('throws a bad-response error when RAGdoll does not return a list', async () => {
    fetchMock.mockResolvedValue(Response.json({ detail: 'oops' }));

    await expect(listAgents(SESSION_TOKEN)).rejects.toMatchObject({ kind: 'bad-response' });
  });

  it('gives null as the temperature when RAGdoll returns an agent without one', async () => {
    const withoutTemperature: Record<string, unknown> = { ...newAgent, id: 'agent-1' };
    delete withoutTemperature.llm_temperature;
    fetchMock.mockResolvedValue(Response.json([withoutTemperature]));

    const [summary] = await listAgents(SESSION_TOKEN);

    expect(summary.temperature).toBeNull();
  });
});

describe('listLanguageModels', () => {
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

  it('asks RAGdoll for the IDUN models as the user, with the IDUN key in the body', async () => {
    fetchMock.mockResolvedValue(Response.json([]));

    await listLanguageModels(SESSION_TOKEN, 'idun-key');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BACKEND_URL}/get_models`);
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual({ provider: 'idun', api_key: 'idun-key' });
    expect((init?.headers as Record<string, string>).Authorization).toBe(`Bearer ${SESSION_TOKEN}`);
  });

  it('returns only the names, skipping entries without one', async () => {
    fetchMock.mockResolvedValue(
      Response.json([
        { provider: 'idun', name: 'openai/gpt-oss-120b', GDPR_compliant: true, description: null },
        { provider: 'idun', name: 'meta/llama-3.3-70b', GDPR_compliant: true, description: 'x' },
        { provider: 'idun' },
        'garbage',
      ]),
    );

    expect(await listLanguageModels(SESSION_TOKEN, 'idun-key')).toEqual([
      'openai/gpt-oss-120b',
      'meta/llama-3.3-70b',
    ]);
  });

  it('throws a bad-response error when RAGdoll does not return a list', async () => {
    fetchMock.mockResolvedValue(Response.json({ detail: 'oops' }));

    await expect(listLanguageModels(SESSION_TOKEN, 'idun-key')).rejects.toMatchObject({
      kind: 'bad-response',
    });
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
    expect(url).toBe(`${BACKEND_URL}/agents`);
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
    expect(url).toBe(`${BACKEND_URL}/agents/agent-1`);
    expect(init?.method).toBe('POST');
    const body = JSON.parse(init?.body as string);
    expect(body).toMatchObject({ id: 'agent-1', llm_temperature: 0.2, name: 'Butikksjef' });
    expect(body.llm_api_key).toBe('');
    expect(body.embedding_api_key).toBe('');
  });

  it("leaves out the access keys' metadata from the list, since RAGdoll keeps the keys itself", async () => {
    fetchMock.mockResolvedValue(Response.json(existing));

    await updateAgent(SESSION_TOKEN, { ...existing, access_key: [{ id: 'key-1', name: 'Chat' }] });

    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).not.toHaveProperty('access_key');
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
      llmModel: 'openai/gpt-oss-120b',
      temperature: 0.2,
      prompt: 'Du er en intervjuer.',
      isPublished: false,
      publicName: '',
      publicDescription: '',
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

describe('publishAgent and unpublishAgent', () => {
  const fetchMock = vi.fn<typeof fetch>();
  const status = {
    is_published: true,
    public_name: 'Kari',
    public_description: 'Øv på intervju',
    published_at: '2026-10-21T10:00:00+00:00',
  };

  beforeEach(() => {
    vi.stubEnv('BACKEND_API_URL', BACKEND_URL);
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('publishes with the name and description', async () => {
    fetchMock.mockResolvedValue(Response.json(status));

    const publication = await publishAgent(SESSION_TOKEN, 'agent-1', 'Kari', 'Øv på intervju');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BACKEND_URL}/agents/agent-1/publish`);
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual({
      public_name: 'Kari',
      public_description: 'Øv på intervju',
    });
    expect(publication).toEqual({
      isPublished: true,
      publicName: 'Kari',
      publicDescription: 'Øv på intervju',
    });
  });

  it('hides the agent', async () => {
    fetchMock.mockResolvedValue(Response.json({ ...status, is_published: false }));

    const publication = await unpublishAgent(SESSION_TOKEN, 'agent-1');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BACKEND_URL}/agents/agent-1/unpublish`);
    expect(init?.method).toBe('POST');
    expect(publication.isPublished).toBe(false);
  });

  it('throws a bad-response error when RAGdoll does not return a status', async () => {
    fetchMock.mockResolvedValue(Response.json({ detail: 'oops' }));

    await expect(unpublishAgent(SESSION_TOKEN, 'agent-1')).rejects.toMatchObject({
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
    expect(url).toBe(`${BACKEND_URL}/agents/agent-1`);
    expect(init?.method).toBe('DELETE');
    expect((init?.headers as Record<string, string>).Authorization).toBe(`Bearer ${SESSION_TOKEN}`);
  });

  it('throws an unreachable error when RAGdoll fails to delete', async () => {
    fetchMock.mockResolvedValue(new Response('Internal Server Error', { status: 500 }));

    await expect(deleteAgent(SESSION_TOKEN, 'agent-1')).rejects.toMatchObject({
      kind: 'unreachable',
    });
  });
});

describe('getChatAccessKey', () => {
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

  it('asks for a chat key for the agent as the logged-in user and returns only the key', async () => {
    // What RAGdoll's POST /agents/{id}/accesskeys returns: a whole AccessKey.
    fetchMock.mockResolvedValue(
      Response.json({
        id: 'key-1',
        key: 'chat-key',
        name: 'Chat Access Key - user-1',
        expiry_date: '2026-10-08T10:00:00',
      }),
    );

    await expect(getChatAccessKey(SESSION_TOKEN, 'agent-1')).resolves.toBe('chat-key');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BACKEND_URL}/agents/agent-1/accesskeys`);
    expect(init?.method).toBe('POST');
    expect((init?.headers as Record<string, string>).Authorization).toBe(`Bearer ${SESSION_TOKEN}`);
  });

  it('encodes the agent id in the URL', async () => {
    fetchMock.mockResolvedValue(Response.json({ key: 'chat-key' }));

    await getChatAccessKey(SESSION_TOKEN, 'a&b');

    expect(fetchMock.mock.calls[0][0]).toBe(`${BACKEND_URL}/agents/a%26b/accesskeys`);
  });

  it('throws a bad-response error when RAGdoll returns no key', async () => {
    fetchMock.mockResolvedValue(Response.json({ id: 'key-1', key: null }));

    await expect(getChatAccessKey(SESSION_TOKEN, 'agent-1')).rejects.toMatchObject({
      kind: 'bad-response',
    });
  });

  it('throws an unauthorized error when RAGdoll refuses (401)', async () => {
    // RAGdoll also answers 401 when the agent belongs to someone else.
    fetchMock.mockResolvedValue(new Response('Unauthorized access to agent', { status: 401 }));

    await expect(getChatAccessKey(SESSION_TOKEN, 'agent-1')).rejects.toMatchObject({
      kind: 'unauthorized',
    });
  });
});

describe('getAgentRole', () => {
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

  it('returns only the name of the agent’s role, never its keys', async () => {
    // RAGdoll sends the owner the whole agent, keys included.
    fetchMock.mockResolvedValue(Response.json({ ...newAgent, id: 'agent-1' }));

    const role = await getAgentRole(SESSION_TOKEN, 'agent-1');

    expect(role).toBe('Butikksjef');
    expect(JSON.stringify(role)).not.toContain('idun-key');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BACKEND_URL}/agents/agent-1`);
    expect((init?.headers as Record<string, string>).Authorization).toBe(`Bearer ${SESSION_TOKEN}`);
  });

  it('returns null when the agent has no roles', async () => {
    fetchMock.mockResolvedValue(Response.json({ ...newAgent, roles: [] }));

    await expect(getAgentRole(SESSION_TOKEN, 'agent-1')).resolves.toBeNull();
  });

  it('throws a bad-response error when RAGdoll does not return an agent', async () => {
    fetchMock.mockResolvedValue(Response.json({ detail: 'oops' }));

    await expect(getAgentRole(SESSION_TOKEN, 'agent-1')).rejects.toMatchObject({
      kind: 'bad-response',
    });
  });
});

const newTemplate: NewRagdollTemplate = {
  type: 'interviewer',
  name: 'Butikksjef',
  description: 'Vennlig og direkte.',
  content: { focus: ['Service'], persona: 'Intervjueren er butikksjef.' },
};

// What RAGdoll returns for a stored template: also the owner and the timestamps.
const storedTemplate = {
  ...newTemplate,
  id: 'template-1',
  owner_id: 'user-1',
  created_at: '2026-10-08T10:00:00Z',
  updated_at: '2026-10-08T10:00:00Z',
};

describe('templates', () => {
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

  it('lists the user’s templates of one type, with only the fields we use', async () => {
    fetchMock.mockResolvedValue(Response.json([storedTemplate]));

    await expect(listTemplates(SESSION_TOKEN, 'interviewer')).resolves.toEqual([
      { ...newTemplate, id: 'template-1' },
    ]);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BACKEND_URL}/templates?type=interviewer`);
    expect((init?.headers as Record<string, string>).Authorization).toBe(`Bearer ${SESSION_TOKEN}`);
  });

  it('throws a bad-response error when the list has something that is not a template', async () => {
    fetchMock.mockResolvedValue(Response.json([{ id: 'template-1' }]));

    await expect(listTemplates(SESSION_TOKEN, 'interviewer')).rejects.toMatchObject({
      kind: 'bad-response',
    });
  });

  it('gets one template by id', async () => {
    fetchMock.mockResolvedValue(Response.json(storedTemplate));

    await expect(getTemplate(SESSION_TOKEN, 'template-1')).resolves.toMatchObject({
      id: 'template-1',
    });
    expect(fetchMock.mock.calls[0][0]).toBe(`${BACKEND_URL}/templates/template-1`);
  });

  it('throws a not-found error when the user has no template with that id (404)', async () => {
    fetchMock.mockResolvedValue(new Response('Template not found', { status: 404 }));

    await expect(getTemplate(SESSION_TOKEN, 'template-1')).rejects.toMatchObject({
      kind: 'not-found',
    });
  });

  it('creates a template and returns it with its id', async () => {
    fetchMock.mockResolvedValue(Response.json(storedTemplate, { status: 201 }));

    await expect(createTemplate(SESSION_TOKEN, newTemplate)).resolves.toMatchObject({
      id: 'template-1',
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BACKEND_URL}/templates`);
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual(newTemplate);
  });

  it('replaces a template and returns it', async () => {
    fetchMock.mockResolvedValue(Response.json(storedTemplate));

    await expect(updateTemplate(SESSION_TOKEN, 'template-1', newTemplate)).resolves.toMatchObject({
      id: 'template-1',
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BACKEND_URL}/templates/template-1`);
    expect(init?.method).toBe('PUT');
    expect(JSON.parse(init?.body as string)).toEqual(newTemplate);
  });

  it('deletes a template and accepts the empty answer', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(deleteTemplate(SESSION_TOKEN, 'template-1')).resolves.toBeUndefined();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BACKEND_URL}/templates/template-1`);
    expect(init?.method).toBe('DELETE');
  });
});

describe('user settings', () => {
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

  it('reads the settings from this app’s namespace', async () => {
    fetchMock.mockResolvedValue(Response.json({ language: 'nb' }));

    await expect(getUserSettings(SESSION_TOKEN)).resolves.toEqual({ language: 'nb' });
    expect(fetchMock.mock.calls[0][0]).toBe(`${BACKEND_URL}/user-settings/interview-configurator`);
  });

  it('replaces the settings in this app’s namespace', async () => {
    fetchMock.mockResolvedValue(Response.json({ language: 'en' }));

    await expect(saveUserSettings(SESSION_TOKEN, { language: 'en' })).resolves.toEqual({
      language: 'en',
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BACKEND_URL}/user-settings/interview-configurator`);
    expect(init?.method).toBe('PUT');
    expect(JSON.parse(init?.body as string)).toEqual({ language: 'en' });
  });

  it('throws a bad-response error when RAGdoll does not return an object', async () => {
    fetchMock.mockResolvedValue(Response.json(['nb']));

    await expect(getUserSettings(SESSION_TOKEN)).rejects.toMatchObject({ kind: 'bad-response' });
  });
});

const newProfile = {
  label: 'Profil A',
  age_range: '18-24',
  experience_level: 'little',
  education: 'videregående',
  work_experience: '',
  languages: ['Norsk B1'],
  practice_areas: ['Mestre nervøsitet'],
  notes: '',
};

// What RAGdoll returns for a stored profile: also the owner and the timestamps.
const storedProfile = {
  ...newProfile,
  id: 'profile-1',
  owner_id: 'user-1',
  created_at: '2026-10-09T10:00:00',
  updated_at: '2026-10-09T10:00:00',
};

describe('profiles', () => {
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

  it('lists the user’s profiles without the owner and the timestamps', async () => {
    fetchMock.mockResolvedValue(Response.json([storedProfile]));

    await expect(listProfiles(SESSION_TOKEN)).resolves.toEqual([
      { ...newProfile, id: 'profile-1' },
    ]);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BACKEND_URL}/profiles`);
    expect((init?.headers as Record<string, string>).Authorization).toBe(`Bearer ${SESSION_TOKEN}`);
  });

  it('reads profiles saved before RAGdoll had experience levels and practice areas', async () => {
    const older: Record<string, unknown> = { ...storedProfile };
    delete older.experience_level;
    delete older.practice_areas;
    fetchMock.mockResolvedValue(Response.json([older]));

    await expect(listProfiles(SESSION_TOKEN)).resolves.toMatchObject([
      { experience_level: null, practice_areas: [] },
    ]);
  });

  // RAGdoll's real answers: a broken token gives a message, a body it doesn't accept a list.
  it('throws unauthorized for a 422 about the token', async () => {
    fetchMock.mockResolvedValue(Response.json({ detail: 'Not enough segments' }, { status: 422 }));

    await expect(createProfile(SESSION_TOKEN, newProfile)).rejects.toMatchObject({
      kind: 'unauthorized',
    });
  });

  it('throws rejected, not unauthorized, for a 422 listing fields RAGdoll does not accept', async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        {
          detail: [
            {
              type: 'extra_forbidden',
              loc: ['body', 'experience_level'],
              msg: 'Extra inputs are not permitted',
              input: 'none',
            },
          ],
        },
        { status: 422 },
      ),
    );

    await expect(createProfile(SESSION_TOKEN, newProfile)).rejects.toMatchObject({
      kind: 'rejected',
      message: expect.stringContaining('experience_level'),
    });
  });

  it('throws a bad-response error when the list has something that is not a profile', async () => {
    fetchMock.mockResolvedValue(Response.json([{ id: 'profile-1' }]));

    await expect(listProfiles(SESSION_TOKEN)).rejects.toMatchObject({ kind: 'bad-response' });
  });

  it('gets one profile, and throws not-found for one the user does not have', async () => {
    fetchMock.mockResolvedValueOnce(Response.json(storedProfile));
    await expect(getProfile(SESSION_TOKEN, 'profile-1')).resolves.toMatchObject({
      id: 'profile-1',
    });
    expect(fetchMock.mock.calls[0][0]).toBe(`${BACKEND_URL}/profiles/profile-1`);

    fetchMock.mockResolvedValueOnce(new Response('Profile not found', { status: 404 }));
    await expect(getProfile(SESSION_TOKEN, 'profile-2')).rejects.toMatchObject({
      kind: 'not-found',
    });
  });

  it('creates, replaces and deletes a profile', async () => {
    fetchMock.mockResolvedValueOnce(Response.json(storedProfile, { status: 201 }));
    await createProfile(SESSION_TOKEN, newProfile);
    expect(fetchMock.mock.calls[0][1]?.method).toBe('POST');
    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toEqual(newProfile);

    fetchMock.mockResolvedValueOnce(Response.json(storedProfile));
    await updateProfile(SESSION_TOKEN, 'profile-1', newProfile);
    expect(fetchMock.mock.calls[1][0]).toBe(`${BACKEND_URL}/profiles/profile-1`);
    expect(fetchMock.mock.calls[1][1]?.method).toBe('PUT');

    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(deleteProfile(SESSION_TOKEN, 'profile-1')).resolves.toBeUndefined();
    expect(fetchMock.mock.calls[2][1]?.method).toBe('DELETE');
  });
});

const newFeedback = {
  rating: 'bad' as const,
  agent_message: 'Hvorfor søker du denne stillingen?',
  user_message: 'Hei, jeg heter Kari.',
  comment: 'Spør om erfaring først.',
};

// What RAGdoll returns for a stored rating: also the agent, the author and the time.
const storedFeedback = {
  ...newFeedback,
  id: 'feedback-1',
  agent_id: 'agent-123',
  author_id: 'user-1',
  created_at: '2026-10-21T10:00:00',
};

describe('feedback', () => {
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

  it('rates a reply as the user and returns the rating without the author', async () => {
    fetchMock.mockResolvedValue(Response.json(storedFeedback, { status: 201 }));

    const stored = await createFeedback(SESSION_TOKEN, 'agent-123', newFeedback);

    expect(stored).toEqual({
      ...newFeedback,
      id: 'feedback-1',
      agent_id: 'agent-123',
      created_at: '2026-10-21T10:00:00',
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BACKEND_URL}/agents/agent-123/feedback`);
    expect(init?.method).toBe('POST');
    expect((init?.headers as Record<string, string>).Authorization).toBe(`Bearer ${SESSION_TOKEN}`);
    expect(JSON.parse(init?.body as string)).toEqual(newFeedback);
  });

  it('throws not-found when the user has no access to the agent (404)', async () => {
    fetchMock.mockResolvedValue(new Response('Agent not found', { status: 404 }));

    await expect(createFeedback(SESSION_TOKEN, 'agent-123', newFeedback)).rejects.toMatchObject({
      kind: 'not-found',
    });
  });

  it('throws a bad-response error when RAGdoll does not return a rating', async () => {
    fetchMock.mockResolvedValue(Response.json({ ...storedFeedback, rating: 'ok' }));

    await expect(createFeedback(SESSION_TOKEN, 'agent-123', newFeedback)).rejects.toMatchObject({
      kind: 'bad-response',
    });
  });

  it('lists the agent’s ratings with a limit', async () => {
    fetchMock.mockResolvedValue(Response.json([storedFeedback]));

    await expect(listFeedback(SESSION_TOKEN, 'agent-123', 10)).resolves.toMatchObject([
      { id: 'feedback-1', rating: 'bad' },
    ]);
    expect(fetchMock.mock.calls[0][0]).toBe(`${BACKEND_URL}/agents/agent-123/feedback?limit=10`);
  });

  it('throws a bad-response error when the list is not a list', async () => {
    fetchMock.mockResolvedValue(Response.json({ items: [] }));

    await expect(listFeedback(SESSION_TOKEN, 'agent-123')).rejects.toMatchObject({
      kind: 'bad-response',
    });
  });

  it('deletes a rating and accepts the empty answer', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(deleteFeedback(SESSION_TOKEN, 'agent-123', 'feedback-1')).resolves.toBeUndefined();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BACKEND_URL}/agents/agent-123/feedback/feedback-1`);
    expect(init?.method).toBe('DELETE');
  });
});
