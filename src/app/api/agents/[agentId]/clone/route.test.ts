// @vitest-environment node
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { interviewer } from '@/domain/agentTypes/interviewer';
import { readStoredAnswers } from '@/domain/agentTypes/storedAnswers';
import { getSessionToken } from '@/lib/session-tokens';
import { toRagdollAgent } from '@/server/agentMapper';
import { fetchFullAgent, RagdollError, saveAgent, updateAgent } from '@/server/ragdoll';
import { POST } from './route';

// The adapter and the mapper have their own tests. Here we only check what the route adds:
// the session check, validating the body, reading the original, and the status codes.
vi.mock('@/lib/session-tokens', () => ({ getSessionToken: vi.fn() }));
vi.mock('@/server/ragdoll', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/server/ragdoll')>();
  return {
    ...original,
    fetchFullAgent: vi.fn(),
    saveAgent: vi.fn(),
    updateAgent: vi.fn(),
  };
});

const getSessionTokenMock = vi.mocked(getSessionToken);
const fetchFullAgentMock = vi.mocked(fetchFullAgent);
const saveAgentMock = vi.mocked(saveAgent);
const updateAgentMock = vi.mocked(updateAgent);

const answers = {
  stilling: 'Butikkmedarbeider',
  bransje: 'Varehandel (privat)',
  bedrift: 'Nærbutikken AS',
  intervjutype: 'første intervju',
  intervjuer: 'butikksjef, vennlig',
  jobbsoker: 'under 25, lite erfaring',
  vanskelighetsgrad: 'lett',
  egneSporsmal: 'ingen',
};
const cloneAnswers = { ...answers, vanskelighetsgrad: 'vanskelig' };

const original = {
  ...toRagdollAgent('Butikkintervju', interviewer, answers, 'idun-key'),
  id: 'agent-1',
};

function postRequest(body: unknown) {
  return new NextRequest('http://localhost/api/agents/agent-1/clone', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const params = { params: Promise.resolve({ agentId: 'agent-1' }) };
const validBody = { name: 'Butikkintervju (kopi)', answers: cloneAnswers };

beforeEach(() => {
  getSessionTokenMock.mockResolvedValue('session-token');
  vi.stubEnv('IDUN_API_KEY', 'idun-key');
  fetchFullAgentMock.mockResolvedValue(original);
  saveAgentMock.mockResolvedValue('agent-2');
  // The route logs problems on purpose; keep the test output clean.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  getSessionTokenMock.mockReset();
  fetchFullAgentMock.mockReset();
  saveAgentMock.mockReset();
  updateAgentMock.mockReset();
});

describe('POST /api/agents/[agentId]/clone', () => {
  it('saves a new agent with the new name and answers, and answers 201 with its id', async () => {
    const res = await POST(postRequest(validBody), params);

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: 'agent-2' });

    expect(fetchFullAgentMock).toHaveBeenCalledWith('session-token', 'agent-1');
    const [token, saved] = saveAgentMock.mock.calls[0];
    expect(token).toBe('session-token');
    expect(saved).not.toHaveProperty('id');
    expect(saved.name).toBe('Butikkintervju (kopi)');
    expect(saved.prompt).toContain('vanskelig');
    expect(readStoredAnswers(saved.description)?.answers).toEqual(cloneAnswers);
  });

  it('stores where answers came from', async () => {
    const sources = { jobbsoker: { kind: 'profile', id: 'profile-1' } };

    await POST(postRequest({ ...validBody, sources }), params);

    const [, saved] = saveAgentMock.mock.calls[0];
    const stored = readStoredAnswers(saved.description);
    expect(stored?.sources).toEqual({ jobbsoker: { kind: 'profile', id: 'profile-1' } });
  });

  it('leaves the original agent unchanged', async () => {
    await POST(postRequest(validBody), params);

    expect(updateAgentMock).not.toHaveBeenCalled();
  });

  it('answers 401 and touches nothing when the user is not logged in', async () => {
    getSessionTokenMock.mockResolvedValue(null);

    const res = await POST(postRequest(validBody), params);

    expect(res.status).toBe(401);
    expect(fetchFullAgentMock).not.toHaveBeenCalled();
    expect(saveAgentMock).not.toHaveBeenCalled();
  });

  it.each([
    ['the body is not JSON', '{not json'],
    ['the name is missing', { answers: cloneAnswers }],
    ['the name is only spaces', { name: '   ', answers: cloneAnswers }],
    ['the name is too long', { name: 'a'.repeat(101), answers: cloneAnswers }],
    ['an answer is missing', { name: 'Kopi', answers: { ...cloneAnswers, bransje: '' } }],
  ])('answers 400 and saves nothing when %s', async (_, body) => {
    const res = await POST(postRequest(body), params);

    expect(res.status).toBe(400);
    expect(saveAgentMock).not.toHaveBeenCalled();
  });

  it('answers 400 when the agent was not made with this app', async () => {
    fetchFullAgentMock.mockResolvedValue({ ...original, description: 'En vanlig beskrivelse' });

    const res = await POST(postRequest(validBody), params);

    expect(res.status).toBe(400);
    expect(saveAgentMock).not.toHaveBeenCalled();
  });

  it('answers 404 and saves nothing when the user has no such agent', async () => {
    fetchFullAgentMock.mockRejectedValue(new RagdollError('not-found', 'no agent'));

    const res = await POST(postRequest(validBody), params);

    expect(res.status).toBe(404);
    expect(saveAgentMock).not.toHaveBeenCalled();
  });

  it('answers 500 when the IDUN key is not set', async () => {
    vi.stubEnv('IDUN_API_KEY', '');

    const res = await POST(postRequest(validBody), params);

    expect(res.status).toBe(500);
    expect(saveAgentMock).not.toHaveBeenCalled();
  });

  it('answers 502 when RAGdoll fails to save', async () => {
    saveAgentMock.mockRejectedValue(new RagdollError('unreachable', 'RAGdoll answered 500'));

    const res = await POST(postRequest(validBody), params);

    expect(res.status).toBe(502);
  });
});
