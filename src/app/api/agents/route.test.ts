// @vitest-environment node
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { readStoredAnswers } from '@/domain/agentTypes/storedAnswers';
import { getSessionToken } from '@/lib/session-tokens';
import { listAgents, RagdollError, saveAgent } from '@/server/ragdoll';
import { GET, POST } from './route';

// The adapter and the mapper have their own tests. Here we only check what the route adds:
// the session check, validating the body, and turning errors into status codes.
vi.mock('@/lib/session-tokens', () => ({ getSessionToken: vi.fn() }));
vi.mock('@/server/ragdoll', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/server/ragdoll')>();
  return { ...original, saveAgent: vi.fn(), listAgents: vi.fn() };
});

const getSessionTokenMock = vi.mocked(getSessionToken);
const saveAgentMock = vi.mocked(saveAgent);
const listAgentsMock = vi.mocked(listAgents);

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
    };
    listAgentsMock.mockResolvedValue([agent]);

    const res = await GET(getRequest());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      agents: [
        {
          ...agent,
          type: 'interviewer',
          typeLabel: 'Intervjuer',
          stilling: 'Butikkmedarbeider',
          bransje: 'Varehandel (privat)',
          vanskelighetsgrad: 'lett | Antall spørsmål: 6 | Oppfølgingsspørsmål: ja',
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
