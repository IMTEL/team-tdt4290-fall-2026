// @vitest-environment node
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_MODEL } from '@/domain/advancedSettings';
import { interviewer } from '@/domain/agentTypes/interviewer';
import { readStoredAnswers } from '@/domain/agentTypes/storedAnswers';
import { getSessionToken } from '@/lib/session-tokens';
import { toRagdollAgent } from '@/server/agentMapper';
import {
  fetchFullAgent,
  listLanguageModels,
  RagdollError,
  saveAgent,
  updateAgent,
} from '@/server/ragdoll';
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
    listLanguageModels: vi.fn(),
  };
});

const getSessionTokenMock = vi.mocked(getSessionToken);
const fetchFullAgentMock = vi.mocked(fetchFullAgent);
const saveAgentMock = vi.mocked(saveAgent);
const updateAgentMock = vi.mocked(updateAgent);
const listLanguageModelsMock = vi.mocked(listLanguageModels);

const answers = {
  stilling: 'Butikkmedarbeider',
  bransje: 'Varehandel (privat)',
  bedrift: 'Nærbutikken AS',
  intervjutype: 'første intervju',
  intervjuer: 'butikksjef, vennlig',
  jobbsoker: 'under 25, lite erfaring',
  vanskelighetsgrad: 'lett',
  egneSporsmal: 'ingen',
  tillegg: '',
  lovverk: '',
};
const cloneAnswers = { ...answers, vanskelighetsgrad: 'vanskelig' };

const original = {
  ...toRagdollAgent('Butikkintervju', interviewer, answers, 'idun-key'),
  id: 'agent-1',
};

// An original with its own model, temperature, max tokens and hand-written prompt.
const tunedOriginal = {
  ...toRagdollAgent(
    'Butikkintervju',
    interviewer,
    answers,
    'idun-key',
    {},
    {
      model: 'old/model',
      temperature: 0.2,
      maxTokens: 3000,
      customPrompt: 'Du er Kari.',
    },
  ),
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
  listLanguageModelsMock.mockResolvedValue([DEFAULT_MODEL, 'meta/llama-3.3-70b']);
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
  listLanguageModelsMock.mockReset();
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

  it('gives the clone the original’s avatar when none is sent', async () => {
    fetchFullAgentMock.mockResolvedValue({
      ...toRagdollAgent(
        'Butikkintervju',
        interviewer,
        answers,
        'idun-key',
        {},
        undefined,
        undefined,
        'bjorn',
      ),
      id: 'agent-1',
    });

    await POST(postRequest(validBody), params);

    const [, saved] = saveAgentMock.mock.calls[0];
    expect(readStoredAnswers(saved.description)?.avatar).toBe('bjorn');
  });

  it('gives the clone the avatar that was chosen, or the default image for null', async () => {
    fetchFullAgentMock.mockResolvedValue({
      ...toRagdollAgent(
        'Butikkintervju',
        interviewer,
        answers,
        'idun-key',
        {},
        undefined,
        undefined,
        'bjorn',
      ),
      id: 'agent-1',
    });

    await POST(postRequest({ ...validBody, avatar: 'sol' }), params);
    await POST(postRequest({ ...validBody, avatar: null }), params);

    const [first, second] = saveAgentMock.mock.calls.map(([, saved]) => saved);
    expect(readStoredAnswers(first.description)?.avatar).toBe('sol');
    expect(readStoredAnswers(second.description)?.avatar).toBeNull();
  });

  it('answers 400 and saves nothing for an avatar that is not one of ours', async () => {
    const res = await POST(postRequest({ ...validBody, avatar: 'fjernet-avatar' }), params);

    expect(res.status).toBe(400);
    expect(saveAgentMock).not.toHaveBeenCalled();
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

  it("gives the clone the original's model, temperature, max tokens and hand-written prompt", async () => {
    fetchFullAgentMock.mockResolvedValue(tunedOriginal);

    const res = await POST(postRequest(validBody), params);

    expect(res.status).toBe(201);
    const [, saved] = saveAgentMock.mock.calls[0];
    expect(saved.llm_model).toBe('old/model');
    expect(saved.llm_temperature).toBe(0.2);
    expect(saved.llm_max_tokens).toBe(3000);
    expect(saved.prompt).toBe('Du er Kari.');
    expect(readStoredAnswers(saved.description)?.customPrompt).toBe(true);
    expect(listLanguageModelsMock).not.toHaveBeenCalled();
  });

  it('saves the advanced settings from the clone form', async () => {
    const advanced = {
      model: 'meta/llama-3.3-70b',
      temperature: 1.1,
      maxTokens: 4000,
      customPrompt: null,
    };

    const res = await POST(postRequest({ ...validBody, advanced }), params);

    expect(res.status).toBe(201);
    const [, saved] = saveAgentMock.mock.calls[0];
    expect(saved.llm_model).toBe('meta/llama-3.3-70b');
    expect(saved.llm_temperature).toBe(1.1);
    expect(saved.llm_max_tokens).toBe(4000);
    expect(saved.prompt).toContain('vanskelig');
    expect(readStoredAnswers(saved.description)?.customPrompt).toBe(false);
  });

  it("accepts the original's model without asking RAGdoll", async () => {
    fetchFullAgentMock.mockResolvedValue(tunedOriginal);
    const advanced = { model: 'old/model', temperature: 0.5, maxTokens: 1000, customPrompt: null };

    const res = await POST(postRequest({ ...validBody, advanced }), params);

    expect(res.status).toBe(201);
    expect(listLanguageModelsMock).not.toHaveBeenCalled();
  });

  it('answers 502 and saves nothing when a new model cannot be checked', async () => {
    listLanguageModelsMock.mockRejectedValue(new RagdollError('unreachable', 'IDUN is down'));
    const advanced = {
      model: 'meta/llama-3.3-70b',
      temperature: 0.7,
      maxTokens: 1000,
      customPrompt: null,
    };

    const res = await POST(postRequest({ ...validBody, advanced }), params);

    expect(res.status).toBe(502);
    expect(saveAgentMock).not.toHaveBeenCalled();
  });

  it.each([
    [
      'a model that is not offered',
      { model: 'gpt-5', temperature: 0.7, maxTokens: 1000, customPrompt: null },
    ],
    [
      'a temperature above 1.5',
      { model: DEFAULT_MODEL, temperature: 2, maxTokens: 1000, customPrompt: null },
    ],
    [
      'too many max tokens',
      { model: DEFAULT_MODEL, temperature: 0.7, maxTokens: 9000, customPrompt: null },
    ],
    [
      'an empty hand-written prompt',
      { model: DEFAULT_MODEL, temperature: 0.7, maxTokens: 1000, customPrompt: ' ' },
    ],
    ['settings that are not an object', 'fast'],
  ])('answers 400 and saves nothing for %s', async (_, advanced) => {
    const res = await POST(postRequest({ ...validBody, advanced }), params);

    expect(res.status).toBe(400);
    expect(saveAgentMock).not.toHaveBeenCalled();
  });
});
