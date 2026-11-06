// @vitest-environment node
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getSessionToken } from '@/lib/session-tokens';
import { syncAgentPromptWithFeedback } from '@/server/feedbackPrompt';
import { deleteFeedback, RagdollError } from '@/server/ragdoll';
import { DELETE } from './route';

vi.mock('@/lib/session-tokens', () => ({ getSessionToken: vi.fn() }));
vi.mock('@/server/feedbackPrompt', () => ({ syncAgentPromptWithFeedback: vi.fn() }));
vi.mock('@/server/ragdoll', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/server/ragdoll')>();
  return { ...original, deleteFeedback: vi.fn() };
});

const getSessionTokenMock = vi.mocked(getSessionToken);
const deleteFeedbackMock = vi.mocked(deleteFeedback);
const syncPromptMock = vi.mocked(syncAgentPromptWithFeedback);

const AGENT_ID = '6ac5303839738c407739d9c9';
const FEEDBACK_ID = '3f2b8c1e-5a4d-4e0f-9b7a-2c1d0e9f8a7b';

function remove(agentId = AGENT_ID, feedbackId = FEEDBACK_ID) {
  const req = new NextRequest(`http://localhost/api/agents/${agentId}/feedback/x`, {
    method: 'DELETE',
  });
  return DELETE(req, { params: Promise.resolve({ agentId, feedbackId }) });
}

beforeEach(() => {
  getSessionTokenMock.mockResolvedValue('session-token');
  deleteFeedbackMock.mockResolvedValue(undefined);
  syncPromptMock.mockResolvedValue(undefined);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  getSessionTokenMock.mockReset();
  deleteFeedbackMock.mockReset();
  syncPromptMock.mockReset();
});

describe('DELETE /api/agents/[agentId]/feedback/[feedbackId]', () => {
  it('deletes the rating and answers 204', async () => {
    const res = await remove();

    expect(res.status).toBe(204);
    expect(deleteFeedbackMock).toHaveBeenCalledWith('session-token', AGENT_ID, FEEDBACK_ID);
    expect(syncPromptMock).toHaveBeenCalledWith('session-token', AGENT_ID);
  });

  it('answers 401 and never calls RAGdoll without a session', async () => {
    getSessionTokenMock.mockResolvedValue(null);

    expect((await remove()).status).toBe(401);
    expect(deleteFeedbackMock).not.toHaveBeenCalled();
  });

  it('answers 404 and never calls RAGdoll for ids that cannot be an agent or a rating', async () => {
    expect((await remove('abc')).status).toBe(404);
    expect((await remove(AGENT_ID, '../../agents')).status).toBe(404);
    expect(deleteFeedbackMock).not.toHaveBeenCalled();
  });

  it('answers 404 when the rating is unknown or belongs to another agent', async () => {
    deleteFeedbackMock.mockRejectedValue(new RagdollError('not-found', 'Feedback not found'));

    expect((await remove()).status).toBe(404);
  });
});
