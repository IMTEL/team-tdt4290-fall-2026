// @vitest-environment node
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getSessionToken } from '@/lib/session-tokens';
import { syncAgentPromptWithFeedback } from '@/server/feedbackPrompt';
import { createFeedback, listFeedback, RagdollError } from '@/server/ragdoll';
import { GET, POST } from './route';

// The adapter and the mapper have their own tests. Here we only check what the route adds: the
// session check, validating the id, the body and the limit, and the status codes.
vi.mock('@/lib/session-tokens', () => ({ getSessionToken: vi.fn() }));
vi.mock('@/server/feedbackPrompt', () => ({ syncAgentPromptWithFeedback: vi.fn() }));
vi.mock('@/server/ragdoll', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/server/ragdoll')>();
  return { ...original, createFeedback: vi.fn(), listFeedback: vi.fn() };
});

const getSessionTokenMock = vi.mocked(getSessionToken);
const createFeedbackMock = vi.mocked(createFeedback);
const listFeedbackMock = vi.mocked(listFeedback);
const syncPromptMock = vi.mocked(syncAgentPromptWithFeedback);

const AGENT_ID = '6ac5303839738c407739d9c9';
const body = {
  rating: 'bad',
  agentMessage: 'Hvorfor søker du denne stillingen?',
  userMessage: 'Hei, jeg heter Kari.',
  comment: 'Spør om erfaring først.',
};
const stored = {
  id: 'feedback-1',
  agent_id: AGENT_ID,
  rating: 'bad' as const,
  agent_message: body.agentMessage,
  user_message: body.userMessage,
  comment: body.comment,
  created_at: '2026-10-21T10:00:00',
};

type RequestOptions = { body?: unknown; id?: string; query?: string };

function request(method: string, { body, id = AGENT_ID, query = '' }: RequestOptions = {}) {
  const req = new NextRequest(`http://localhost/api/agents/${id}/feedback${query}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
  return [req, { params: Promise.resolve({ agentId: id }) }] as const;
}

beforeEach(() => {
  getSessionTokenMock.mockResolvedValue('session-token');
  createFeedbackMock.mockResolvedValue(stored);
  listFeedbackMock.mockResolvedValue([stored]);
  syncPromptMock.mockResolvedValue(undefined);
  // The route logs problems on purpose; keep the test output clean.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  getSessionTokenMock.mockReset();
  createFeedbackMock.mockReset();
  listFeedbackMock.mockReset();
  syncPromptMock.mockReset();
});

describe('POST /api/agents/[agentId]/feedback', () => {
  it('rates the reply as the counsellor and returns the rating with its id', async () => {
    const res = await POST(...request('POST', { body }));

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({
      feedback: { ...body, id: 'feedback-1', createdAt: '2026-10-21T10:00:00' },
    });
    expect(createFeedbackMock).toHaveBeenCalledWith('session-token', AGENT_ID, {
      rating: 'bad',
      agent_message: body.agentMessage,
      user_message: body.userMessage,
      comment: body.comment,
    });
    expect(syncPromptMock).toHaveBeenCalledWith('session-token', AGENT_ID);
  });

  it('still saves the rating when writing it into the prompt fails', async () => {
    syncPromptMock.mockRejectedValueOnce(new Error('RAGdoll timed out'));

    const res = await POST(...request('POST', { body }));

    expect(res.status).toBe(201);
    expect(createFeedbackMock).toHaveBeenCalled();
  });

  it('never passes an author or agent from the browser on to RAGdoll', async () => {
    await POST(
      ...request('POST', {
        body: { ...body, authorId: 'someone-else', agent_id: '000000000000000000000000' },
      }),
    );

    const [, agentId, sent] = createFeedbackMock.mock.calls[0];
    expect(agentId).toBe(AGENT_ID);
    expect(Object.keys(sent).sort()).toEqual([
      'agent_message',
      'comment',
      'rating',
      'user_message',
    ]);
  });

  it('answers 401 and never calls RAGdoll without a session', async () => {
    getSessionTokenMock.mockResolvedValue(null);

    expect((await POST(...request('POST', { body }))).status).toBe(401);
    expect(createFeedbackMock).not.toHaveBeenCalled();
  });

  it('answers 404 and never calls RAGdoll for an id that is not an agent id', async () => {
    expect((await POST(...request('POST', { body, id: 'abc' }))).status).toBe(404);
    expect(createFeedbackMock).not.toHaveBeenCalled();
  });

  it('answers 400 for invalid JSON and for invalid feedback', async () => {
    expect((await POST(...request('POST', { body: '{not json' }))).status).toBe(400);
    for (const invalid of [
      { ...body, rating: 'ok' },
      { ...body, agentMessage: '' },
      { ...body, comment: 'a'.repeat(501) },
    ]) {
      expect((await POST(...request('POST', { body: invalid }))).status).toBe(400);
    }
    expect(createFeedbackMock).not.toHaveBeenCalled();
  });

  it('answers 404 when the counsellor has no access to the agent', async () => {
    createFeedbackMock.mockRejectedValue(new RagdollError('not-found', 'Agent not found'));

    expect((await POST(...request('POST', { body }))).status).toBe(404);
  });

  it('never shows RAGdoll’s own error message to the browser', async () => {
    createFeedbackMock.mockRejectedValue(
      new RagdollError('unreachable', 'RAGdoll answered 500: Traceback (most recent call last)'),
    );

    const res = await POST(...request('POST', { body }));

    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toContain('Traceback');
  });
});

describe('GET /api/agents/[agentId]/feedback', () => {
  it('lists the agent’s ratings, 50 by default', async () => {
    const res = await GET(...request('GET'));

    expect(res.status).toBe(200);
    expect((await res.json()).feedback).toEqual([
      { ...body, id: 'feedback-1', createdAt: '2026-10-21T10:00:00' },
    ]);
    expect(listFeedbackMock).toHaveBeenCalledWith('session-token', AGENT_ID, 50);
  });

  it('passes a valid limit on and answers 400 for an invalid one', async () => {
    await GET(...request('GET', { query: '?limit=10' }));
    expect(listFeedbackMock).toHaveBeenCalledWith('session-token', AGENT_ID, 10);

    for (const limit of ['0', '201', '1.5', 'abc']) {
      expect((await GET(...request('GET', { query: `?limit=${limit}` }))).status).toBe(400);
    }
    expect(listFeedbackMock).toHaveBeenCalledTimes(1);
  });

  it('answers 401 without a session and 404 for a bad agent id, without calling RAGdoll', async () => {
    expect((await GET(...request('GET', { id: 'abc' }))).status).toBe(404);
    getSessionTokenMock.mockResolvedValue(null);
    expect((await GET(...request('GET'))).status).toBe(401);
    expect(listFeedbackMock).not.toHaveBeenCalled();
  });

  it('answers 404 when the counsellor has no access to the agent', async () => {
    listFeedbackMock.mockRejectedValue(new RagdollError('not-found', 'Agent not found'));

    expect((await GET(...request('GET'))).status).toBe(404);
  });
});
