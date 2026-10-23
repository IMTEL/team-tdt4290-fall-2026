// @vitest-environment node
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_MODEL } from '@/domain/advancedSettings';
import { readStoredAnswers } from '@/domain/agentTypes/storedAnswers';
import { getSessionToken } from '@/lib/session-tokens';
import { listAgents, listLanguageModels, RagdollError, saveAgent } from '@/server/ragdoll';
import { GET, POST } from './route';

// The adapter and the mapper have their own tests. Here we only check what the route adds:
// the session check, validating the body, and turning errors into status codes.
vi.mock('@/lib/session-tokens', () => ({ getSessionToken: vi.fn() }));
vi.mock('@/server/ragdoll', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/server/ragdoll')>();
  return { ...original, saveAgent: vi.fn(), listAgents: vi.fn(), listLanguageModels: vi.fn() };
});

const getSessionTokenMock = vi.mocked(getSessionToken);
const saveAgentMock = vi.mocked(saveAgent);
const listAgentsMock = vi.mocked(listAgents);
const listLanguageModelsMock = vi.mocked(listLanguageModels);

const configuration = {
  stilling: 'Butikkmedarbeider',
  bransje: 'Varehandel (privat)',
  bedrift: 'Nærbutikken AS',
  intervjutype: 'første intervju',
  intervjuer: 'butikksjef, vennlig',
  jobbsoker: 'under 25, lite erfaring',
  vanskelighetsgrad: 'lett | Antall spørsmål: 6 | Oppfølgingsspørsmål: ja',
  egneSporsmal: 'ingen',
  tillegg: '',
};

function postRequest(body: unknown) {
  return new NextRequest('http://localhost/api/agents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const getRequest = () => new NextRequest('http://localhost/api/agents');

beforeEach(() => {
  getSessionTokenMock.mockResolvedValue('session-token');
  listLanguageModelsMock.mockResolvedValue([DEFAULT_MODEL, 'meta/llama-3.3-70b']);
  vi.stubEnv('IDUN_API_KEY', 'idun-key');
  // The route logs problems on purpose; keep the test output clean.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  getSessionTokenMock.mockReset();
  saveAgentMock.mockReset();
  listAgentsMock.mockReset();
  listLanguageModelsMock.mockReset();
});

describe('POST /api/agents', () => {
  it('saves the agent as the logged-in user and returns its id', async () => {
    saveAgentMock.mockResolvedValue('new-agent-1');

    const res = await POST(postRequest({ name: 'Testintervjuer', configuration }));

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: 'new-agent-1' });
    const [token, agent] = saveAgentMock.mock.calls[0];
    expect(token).toBe('session-token');
    expect(agent.name).toBe('Testintervjuer');
    expect(agent.llm_api_key).toBe('idun-key');
  });

  it('saves the agent as the chosen type', async () => {
    saveAgentMock.mockResolvedValue('new-agent-1');

    await POST(postRequest({ name: 'Testintervjuer', type: 'interviewer', configuration }));

    const [, saved] = saveAgentMock.mock.calls[0];
    expect(readStoredAnswers(saved.description)?.definition.id).toBe('interviewer');
  });

  it('saves an interviewer when the client sends no type', async () => {
    saveAgentMock.mockResolvedValue('new-agent-1');

    await POST(postRequest({ name: 'Testintervjuer', configuration }));

    const [, saved] = saveAgentMock.mock.calls[0];
    expect(JSON.parse(saved.description).type).toBe('interviewer');
  });

  it('uses the default model and temperature without advanced settings', async () => {
    saveAgentMock.mockResolvedValue('new-agent-1');

    await POST(postRequest({ name: 'Testintervjuer', configuration }));

    const [, agent] = saveAgentMock.mock.calls[0];
    expect(agent.llm_model).toBe(DEFAULT_MODEL);
    expect(agent.llm_temperature).toBe(0.7);
    expect(listLanguageModelsMock).not.toHaveBeenCalled();
  });

  it('saves the agent with the chosen advanced settings', async () => {
    saveAgentMock.mockResolvedValue('new-agent-1');
    const advanced = { model: 'meta/llama-3.3-70b', temperature: 0.3, customPrompt: 'Du er Kari.' };

    const res = await POST(postRequest({ name: 'Testintervjuer', configuration, advanced }));

    expect(res.status).toBe(201);
    const [, agent] = saveAgentMock.mock.calls[0];
    expect(agent.llm_model).toBe('meta/llama-3.3-70b');
    expect(agent.llm_temperature).toBe(0.3);
    expect(agent.prompt).toBe('Du er Kari.');
    expect(readStoredAnswers(agent.description)?.customPrompt).toBe(true);
  });

  it('does not ask RAGdoll for the models when the default model is kept', async () => {
    saveAgentMock.mockResolvedValue('new-agent-1');
    const advanced = { model: DEFAULT_MODEL, temperature: 0.2, customPrompt: null };

    const res = await POST(postRequest({ name: 'Testintervjuer', configuration, advanced }));

    expect(res.status).toBe(201);
    expect(listLanguageModelsMock).not.toHaveBeenCalled();
  });

  it('answers 502 and saves nothing when another model cannot be checked', async () => {
    // RAGdoll answers 401 when IDUN rejects the key: that must not look like a logout.
    listLanguageModelsMock.mockRejectedValue(new RagdollError('unauthorized', 'IDUN said 401'));
    const advanced = { model: 'meta/llama-3.3-70b', temperature: 0.7, customPrompt: null };

    const res = await POST(postRequest({ name: 'Testintervjuer', configuration, advanced }));

    expect(res.status).toBe(502);
    expect(saveAgentMock).not.toHaveBeenCalled();
  });

  it('answers 400 and saves nothing for invalid advanced settings', async () => {
    const advanced = { model: 'gpt-5', temperature: 0.7, customPrompt: null };

    const res = await POST(postRequest({ name: 'Testintervjuer', configuration, advanced }));

    expect(res.status).toBe(400);
    expect(saveAgentMock).not.toHaveBeenCalled();
  });

  it('stores where answers came from, and leaves out sources that are not valid', async () => {
    saveAgentMock.mockResolvedValue('new-agent-1');
    const sources = {
      jobbsoker: { kind: 'profile', id: 'profile-1' },
      intervjuer: { kind: 'robot', id: 'x' },
    };

    await POST(postRequest({ name: 'Testintervjuer', configuration, sources }));

    const [, saved] = saveAgentMock.mock.calls[0];
    const stored = readStoredAnswers(saved.description);
    expect(stored?.sources).toEqual({ jobbsoker: { kind: 'profile', id: 'profile-1' } });
  });

  it('saves the chosen avatar with the agent', async () => {
    saveAgentMock.mockResolvedValue('new-agent-1');

    const res = await POST(postRequest({ name: 'Testintervjuer', configuration, avatar: 'ugle' }));

    expect(res.status).toBe(201);
    const [, saved] = saveAgentMock.mock.calls[0];
    expect(readStoredAnswers(saved.description)?.avatar).toBe('ugle');
  });

  it('saves an agent without an avatar when none is sent, or the default image is chosen', async () => {
    saveAgentMock.mockResolvedValue('new-agent-1');

    await POST(postRequest({ name: 'Testintervjuer', configuration }));
    await POST(postRequest({ name: 'Testintervjuer', configuration, avatar: null }));

    for (const [, saved] of saveAgentMock.mock.calls) {
      expect(readStoredAnswers(saved.description)?.avatar).toBeNull();
    }
  });

  it.each([['fjernet-avatar'], [''], [7], [{ id: 'ugle' }]])(
    'answers 400 and saves nothing for the avatar %j, which is not one of ours',
    async (avatar) => {
      const res = await POST(postRequest({ name: 'Testintervjuer', configuration, avatar }));

      expect(res.status).toBe(400);
      expect(saveAgentMock).not.toHaveBeenCalled();
    },
  );

  it('answers 401 and saves nothing when the user is not logged in', async () => {
    getSessionTokenMock.mockResolvedValue(null);

    const res = await POST(postRequest({ name: 'Testintervjuer', configuration }));

    expect(res.status).toBe(401);
    expect(saveAgentMock).not.toHaveBeenCalled();
  });

  it.each([
    ['the body is not JSON', '{not json'],
    ['the name is missing', { configuration }],
    ['the name is only spaces', { name: '   ', configuration }],
    ['the configuration is missing', { name: 'Testintervjuer' }],
    ['the type is unknown', { name: 'Testintervjuer', type: 'finnes-ikke', configuration }],
    ['the type is only planned', { name: 'Testintervjuer', type: 'teacher', configuration }],
    [
      'a configuration field is empty',
      { name: 'Testintervjuer', configuration: { ...configuration, stilling: '' } },
    ],
  ])('answers 400 when %s', async (_case, body) => {
    const res = await POST(postRequest(body));

    expect(res.status).toBe(400);
    expect(saveAgentMock).not.toHaveBeenCalled();
  });

  it('answers 500 when the IDUN key is not set', async () => {
    vi.stubEnv('IDUN_API_KEY', '');

    const res = await POST(postRequest({ name: 'Testintervjuer', configuration }));

    expect(res.status).toBe(500);
    expect(saveAgentMock).not.toHaveBeenCalled();
  });

  it('answers 401 when RAGdoll says the session has expired', async () => {
    saveAgentMock.mockRejectedValue(new RagdollError('unauthorized', 'expired'));

    const res = await POST(postRequest({ name: 'Testintervjuer', configuration }));

    expect(res.status).toBe(401);
  });

  it('never passes RAGdoll’s own error message to the browser', async () => {
    saveAgentMock.mockRejectedValue(new RagdollError('unreachable', 'secret internal detail'));

    const res = await POST(postRequest({ name: 'Testintervjuer', configuration }));

    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toContain('secret internal detail');
  });
});

describe('GET /api/agents', () => {
  it('returns the logged-in user’s agents, with the fields the cards use', async () => {
    const agent = {
      id: 'a1',
      name: 'Testintervjuer',
      description: JSON.stringify({ type: 'interviewer', version: 1, answers: configuration }),
      lastUpdated: 'x',
      llmModel: DEFAULT_MODEL,
      temperature: 0.7,
      prompt: 'Du er en intervjuer.',
    };
    listAgentsMock.mockResolvedValue([agent]);

    const res = await GET(getRequest());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      agents: [
        {
          ...agent,
          avatar: null,
          type: 'interviewer',
          typeLabel: 'Intervjuer',
          stilling: 'Butikkmedarbeider',
          bransje: 'Varehandel (privat)',
          vanskelighetsgrad: 'lett | Antall spørsmål: 6 | Oppfølgingsspørsmål: ja',
          intervjuer: 'butikksjef, vennlig',
          intervjutype: 'første intervju',
          intervjuerMal: null,
        },
      ],
    });
    expect(listAgentsMock).toHaveBeenCalledWith('session-token');
  });

  it('answers 401 when the user is not logged in', async () => {
    getSessionTokenMock.mockResolvedValue(null);

    const res = await GET(getRequest());

    expect(res.status).toBe(401);
    expect(listAgentsMock).not.toHaveBeenCalled();
  });
});

describe('GET /api/agents avatar', () => {
  it('gives each agent’s avatar, so the cards can show it', async () => {
    const withAvatar = {
      id: 'a1',
      name: 'Testintervjuer',
      description: JSON.stringify({
        type: 'interviewer',
        version: 1,
        answers: configuration,
        avatar: 'pingvin',
      }),
      lastUpdated: 'x',
      llmModel: DEFAULT_MODEL,
      temperature: 0.7,
      prompt: 'Du er en intervjuer.',
    };
    listAgentsMock.mockResolvedValue([withAvatar]);

    const res = await GET(getRequest());

    expect((await res.json()).agents[0].avatar).toBe('pingvin');
  });
});
