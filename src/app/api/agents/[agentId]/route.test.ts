// @vitest-environment node
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_MODEL } from '@/domain/advancedSettings';
import { interviewer } from '@/domain/agentTypes/interviewer';
import { readStoredAnswers } from '@/domain/agentTypes/storedAnswers';
import { getSessionToken } from '@/lib/session-tokens';
import { toRagdollAgent } from '@/server/agentMapper';
import {
  deleteAgent,
  fetchFullAgent,
  isAgentOwner,
  listLanguageModels,
  RagdollError,
  updateAgent,
} from '@/server/ragdoll';
import { DELETE, PUT } from './route';

// The adapter and the mapper have their own tests. Here we only check what the route adds:
// the session check, validating the body, reading before writing, and the status codes.
vi.mock('@/lib/session-tokens', () => ({ getSessionToken: vi.fn() }));
vi.mock('@/server/ragdoll', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/server/ragdoll')>();
  return {
    ...original,
    fetchFullAgent: vi.fn(),
    updateAgent: vi.fn(),
    isAgentOwner: vi.fn(),
    deleteAgent: vi.fn(),
    listLanguageModels: vi.fn(),
  };
});

const getSessionTokenMock = vi.mocked(getSessionToken);
const fetchFullAgentMock = vi.mocked(fetchFullAgent);
const updateAgentMock = vi.mocked(updateAgent);
const isAgentOwnerMock = vi.mocked(isAgentOwner);
const deleteAgentMock = vi.mocked(deleteAgent);
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
const newAnswers = { ...answers, vanskelighetsgrad: 'vanskelig' };

// The agent as RAGdoll has it before the edit, with a field we never set ourselves.
const existing = {
  ...toRagdollAgent('Gammelt navn', interviewer, answers, 'idun-key'),
  id: 'agent-1',
  llm_temperature: 0.2,
};

function putRequest(body: unknown) {
  return new NextRequest('http://localhost/api/agents/agent-1', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const params = { params: Promise.resolve({ agentId: 'agent-1' }) };

beforeEach(() => {
  getSessionTokenMock.mockResolvedValue('session-token');
  fetchFullAgentMock.mockResolvedValue(existing);
  updateAgentMock.mockResolvedValue({
    id: 'agent-1',
    name: 'Nytt navn',
    description: '{}',
    lastUpdated: '2026-10-06T12:00:00.000Z',
    llmModel: DEFAULT_MODEL,
    temperature: 0.2,
    prompt: 'Du er en intervjuer.',
  });
  listLanguageModelsMock.mockResolvedValue([DEFAULT_MODEL, 'meta/llama-3.3-70b']);
  vi.stubEnv('IDUN_API_KEY', 'idun-key');
  isAgentOwnerMock.mockResolvedValue(true);
  deleteAgentMock.mockResolvedValue(undefined);
  // The route logs problems on purpose; keep the test output clean.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  listLanguageModelsMock.mockReset();
  getSessionTokenMock.mockReset();
  fetchFullAgentMock.mockReset();
  updateAgentMock.mockReset();
  isAgentOwnerMock.mockReset();
  deleteAgentMock.mockReset();
});

describe('PUT /api/agents/[agentId]', () => {
  it('updates the same agent with the new name, answers and prompt', async () => {
    const res = await PUT(putRequest({ name: 'Nytt navn', answers: newAnswers }), params);

    expect(res.status).toBe(200);
    expect((await res.json()).agent.name).toBe('Nytt navn');

    expect(fetchFullAgentMock).toHaveBeenCalledWith('session-token', 'agent-1');
    const [token, saved] = updateAgentMock.mock.calls[0];
    expect(token).toBe('session-token');
    expect(saved.id).toBe('agent-1');
    expect(saved.name).toBe('Nytt navn');
    expect(saved.prompt).toContain('vanskelig');
    expect(readStoredAnswers(saved.description)?.answers).toEqual(newAnswers);
    // Fields the edit does not touch are sent back unchanged.
    expect(saved.llm_temperature).toBe(0.2);
  });

  it('stores where answers came from', async () => {
    const sources = { jobbsoker: { kind: 'profile', id: 'profile-1' } };

    await PUT(putRequest({ name: 'Nytt navn', answers: newAnswers, sources }), params);

    const [, saved] = updateAgentMock.mock.calls[0];
    const stored = readStoredAnswers(saved.description);
    expect(stored?.sources).toEqual({ jobbsoker: { kind: 'profile', id: 'profile-1' } });
  });

  it('answers 401 and touches nothing when the user is not logged in', async () => {
    getSessionTokenMock.mockResolvedValue(null);

    const res = await PUT(putRequest({ name: 'Nytt navn', answers: newAnswers }), params);

    expect(res.status).toBe(401);
    expect(fetchFullAgentMock).not.toHaveBeenCalled();
    expect(updateAgentMock).not.toHaveBeenCalled();
  });

  it.each([
    ['the body is not JSON', '{not json'],
    ['the name is missing', { answers: newAnswers }],
    ['the name is only spaces', { name: '   ', answers: newAnswers }],
    ['the name is too long', { name: 'a'.repeat(101), answers: newAnswers }],
    ['an answer is missing', { name: 'Nytt navn', answers: { ...newAnswers, bransje: '' } }],
  ])('answers 400 and saves nothing when %s', async (_, body) => {
    const res = await PUT(putRequest(body), params);

    expect(res.status).toBe(400);
    expect(updateAgentMock).not.toHaveBeenCalled();
  });

  it('answers 400 when the agent was not made with this app', async () => {
    fetchFullAgentMock.mockResolvedValue({ ...existing, description: 'En vanlig beskrivelse' });

    const res = await PUT(putRequest({ name: 'Nytt navn', answers: newAnswers }), params);

    expect(res.status).toBe(400);
    expect(updateAgentMock).not.toHaveBeenCalled();
  });

  it('answers 404 and never writes when the user has no such agent', async () => {
    // Writing would make RAGdoll create a new agent, so this must stop before updateAgent.
    fetchFullAgentMock.mockRejectedValue(new RagdollError('not-found', 'no agent'));

    const res = await PUT(putRequest({ name: 'Nytt navn', answers: newAnswers }), params);

    expect(res.status).toBe(404);
    expect(updateAgentMock).not.toHaveBeenCalled();
  });

  it('answers 502 when RAGdoll fails to save', async () => {
    updateAgentMock.mockRejectedValue(new RagdollError('unreachable', 'RAGdoll answered 500'));

    const res = await PUT(putRequest({ name: 'Nytt navn', answers: newAnswers }), params);

    expect(res.status).toBe(502);
  });

  it('saves new advanced settings', async () => {
    const advanced = { model: 'meta/llama-3.3-70b', temperature: 1.1, customPrompt: 'Du er Kari.' };

    const res = await PUT(putRequest({ name: 'Nytt navn', answers, advanced }), params);

    expect(res.status).toBe(200);
    const [, saved] = updateAgentMock.mock.calls[0];
    expect(saved.llm_model).toBe('meta/llama-3.3-70b');
    expect(saved.llm_temperature).toBe(1.1);
    expect(saved.prompt).toBe('Du er Kari.');
    expect(readStoredAnswers(saved.description)?.customPrompt).toBe(true);
  });

  it('saves a new avatar', async () => {
    const res = await PUT(putRequest({ name: 'Nytt navn', answers, avatar: 'rev' }), params);

    expect(res.status).toBe(200);
    const [, saved] = updateAgentMock.mock.calls[0];
    expect(readStoredAnswers(saved.description)?.avatar).toBe('rev');
  });

  it('keeps the avatar when none is sent', async () => {
    fetchFullAgentMock.mockResolvedValue({
      ...existing,
      ...toRagdollAgent(
        'Gammelt navn',
        interviewer,
        answers,
        'idun-key',
        {},
        undefined,
        undefined,
        'katt',
      ),
      id: 'agent-1',
    });

    await PUT(putRequest({ name: 'Nytt navn', answers: newAnswers }), params);

    const [, saved] = updateAgentMock.mock.calls[0];
    expect(readStoredAnswers(saved.description)?.avatar).toBe('katt');
  });

  it('goes back to the default image when null is sent', async () => {
    fetchFullAgentMock.mockResolvedValue({
      ...existing,
      ...toRagdollAgent(
        'Gammelt navn',
        interviewer,
        answers,
        'idun-key',
        {},
        undefined,
        undefined,
        'katt',
      ),
      id: 'agent-1',
    });

    await PUT(putRequest({ name: 'Nytt navn', answers, avatar: null }), params);

    const [, saved] = updateAgentMock.mock.calls[0];
    expect(readStoredAnswers(saved.description)?.avatar).toBeNull();
  });

  it('answers 400 and writes nothing for an avatar that is not one of ours', async () => {
    const res = await PUT(
      putRequest({ name: 'Nytt navn', answers, avatar: 'fjernet-avatar' }),
      params,
    );

    expect(res.status).toBe(400);
    expect(updateAgentMock).not.toHaveBeenCalled();
  });

  it('keeps the model and temperature when no advanced settings are sent', async () => {
    await PUT(putRequest({ name: 'Nytt navn', answers: newAnswers }), params);

    const [, saved] = updateAgentMock.mock.calls[0];
    expect(saved.llm_model).toBe(DEFAULT_MODEL);
    expect(saved.llm_temperature).toBe(0.2);
    expect(listLanguageModelsMock).not.toHaveBeenCalled();
  });

  it('accepts the current model of the agent without asking RAGdoll', async () => {
    fetchFullAgentMock.mockResolvedValue({ ...existing, llm_model: 'old/model' });
    const advanced = { model: 'old/model', temperature: 0.5, customPrompt: null };

    const res = await PUT(putRequest({ name: 'Nytt navn', answers, advanced }), params);

    expect(res.status).toBe(200);
    expect(listLanguageModelsMock).not.toHaveBeenCalled();
  });

  it('answers 502 and saves nothing when a new model cannot be checked', async () => {
    listLanguageModelsMock.mockRejectedValue(new RagdollError('unreachable', 'IDUN is down'));
    const advanced = { model: 'meta/llama-3.3-70b', temperature: 0.7, customPrompt: null };

    const res = await PUT(putRequest({ name: 'Nytt navn', answers, advanced }), params);

    expect(res.status).toBe(502);
    expect(updateAgentMock).not.toHaveBeenCalled();
  });

  it.each([
    ['a model that is not offered', { model: 'gpt-5', temperature: 0.7, customPrompt: null }],
    ['a temperature above 2', { model: DEFAULT_MODEL, temperature: 3, customPrompt: null }],
    ['an empty hand-written prompt', { model: DEFAULT_MODEL, temperature: 0.7, customPrompt: ' ' }],
    ['settings that are not an object', 'fast'],
  ])('answers 400 and saves nothing for %s', async (_, advanced) => {
    const res = await PUT(putRequest({ name: 'Nytt navn', answers, advanced }), params);

    expect(res.status).toBe(400);
    expect(updateAgentMock).not.toHaveBeenCalled();
  });
});

function deleteRequest() {
  return new NextRequest('http://localhost/api/agents/agent-1', { method: 'DELETE' });
}

describe('DELETE /api/agents/[agentId]', () => {
  it('deletes the agent when the user owns it, and answers 204', async () => {
    const res = await DELETE(deleteRequest(), params);

    expect(res.status).toBe(204);
    expect(deleteAgentMock).toHaveBeenCalledWith('session-token', 'agent-1');
  });

  it('answers 401 and touches nothing when the user is not logged in', async () => {
    getSessionTokenMock.mockResolvedValue(null);

    const res = await DELETE(deleteRequest(), params);

    expect(res.status).toBe(401);
    expect(fetchFullAgentMock).not.toHaveBeenCalled();
    expect(deleteAgentMock).not.toHaveBeenCalled();
  });

  it('answers 404 and deletes nothing when the user has no such agent', async () => {
    fetchFullAgentMock.mockRejectedValue(new RagdollError('not-found', 'no agent'));

    const res = await DELETE(deleteRequest(), params);

    expect(res.status).toBe(404);
    expect(deleteAgentMock).not.toHaveBeenCalled();
  });

  it('answers 403 and deletes nothing when the user only collaborates on the agent', async () => {
    isAgentOwnerMock.mockResolvedValue(false);

    const res = await DELETE(deleteRequest(), params);

    expect(res.status).toBe(403);
    expect(deleteAgentMock).not.toHaveBeenCalled();
  });

  it('answers 502 when RAGdoll fails to delete', async () => {
    deleteAgentMock.mockRejectedValue(new RagdollError('unreachable', 'RAGdoll answered 500'));

    const res = await DELETE(deleteRequest(), params);

    expect(res.status).toBe(502);
  });
});
