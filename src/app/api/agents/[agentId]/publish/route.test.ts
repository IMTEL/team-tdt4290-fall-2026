// @vitest-environment node
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getSessionToken } from '@/lib/session-tokens';
import {
  fetchFullAgent,
  isAgentOwner,
  publishAgent,
  RagdollError,
  unpublishAgent,
} from '@/server/ragdoll';
import { DELETE, POST } from './route';

// The adapter has its own tests. Here we check the session, the body, the owner check and the
// status codes.
vi.mock('@/lib/session-tokens', () => ({ getSessionToken: vi.fn() }));
vi.mock('@/server/ragdoll', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/server/ragdoll')>();
  return {
    ...original,
    fetchFullAgent: vi.fn(),
    isAgentOwner: vi.fn(),
    publishAgent: vi.fn(),
    unpublishAgent: vi.fn(),
  };
});

const getSessionTokenMock = vi.mocked(getSessionToken);
const fetchFullAgentMock = vi.mocked(fetchFullAgent);
const isAgentOwnerMock = vi.mocked(isAgentOwner);
const publishAgentMock = vi.mocked(publishAgent);
const unpublishAgentMock = vi.mocked(unpublishAgent);

const params = { params: Promise.resolve({ agentId: 'agent-1' }) };
const published = {
  isPublished: true,
  publicName: 'Kari fra NAV',
  publicDescription: 'Øv på et første intervju',
};

function postRequest(body: unknown) {
  return new NextRequest('http://localhost/api/agents/agent-1/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

function deleteRequest() {
  return new NextRequest('http://localhost/api/agents/agent-1/publish', { method: 'DELETE' });
}

beforeEach(() => {
  getSessionTokenMock.mockResolvedValue('session-token');
  fetchFullAgentMock.mockResolvedValue({} as Awaited<ReturnType<typeof fetchFullAgent>>);
  isAgentOwnerMock.mockResolvedValue(true);
  publishAgentMock.mockResolvedValue(published);
  unpublishAgentMock.mockResolvedValue({ ...published, isPublished: false });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/agents/[agentId]/publish', () => {
  it('publishes with the trimmed name and description', async () => {
    const res = await POST(
      postRequest({
        publicName: '  Kari fra NAV ',
        publicDescription: ' Øv på et første intervju ',
      }),
      params,
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ publication: published });
    expect(publishAgentMock).toHaveBeenCalledWith(
      'session-token',
      'agent-1',
      'Kari fra NAV',
      'Øv på et første intervju',
    );
  });

  it('answers 401 and touches nothing when the user is not logged in', async () => {
    getSessionTokenMock.mockResolvedValue(null);

    const res = await POST(postRequest({ publicName: 'Kari' }), params);

    expect(res.status).toBe(401);
    expect(fetchFullAgentMock).not.toHaveBeenCalled();
    expect(publishAgentMock).not.toHaveBeenCalled();
  });

  it.each([
    ['an empty name', { publicName: '   ' }],
    ['a description that is too long', { publicName: 'Kari', publicDescription: 'x'.repeat(301) }],
    ['broken JSON', '{'],
  ])('answers 400 and publishes nothing for %s', async (_, body) => {
    const res = await POST(postRequest(body), params);

    expect(res.status).toBe(400);
    expect(publishAgentMock).not.toHaveBeenCalled();
  });

  it('answers 404 when the user has no such agent', async () => {
    fetchFullAgentMock.mockRejectedValue(new RagdollError('not-found', 'no agent'));

    const res = await POST(postRequest({ publicName: 'Kari' }), params);

    expect(res.status).toBe(404);
    expect(publishAgentMock).not.toHaveBeenCalled();
  });

  it('answers 403 when the user only collaborates on the agent', async () => {
    isAgentOwnerMock.mockResolvedValue(false);

    const res = await POST(postRequest({ publicName: 'Kari' }), params);

    expect(res.status).toBe(403);
    expect(publishAgentMock).not.toHaveBeenCalled();
  });

  it('answers 502 when RAGdoll fails to publish', async () => {
    publishAgentMock.mockRejectedValue(new RagdollError('unreachable', 'boom'));

    const res = await POST(postRequest({ publicName: 'Kari' }), params);

    expect(res.status).toBe(502);
  });
});

describe('DELETE /api/agents/[agentId]/publish', () => {
  it('hides the agent', async () => {
    const res = await DELETE(deleteRequest(), params);

    expect(res.status).toBe(200);
    expect((await res.json()).publication.isPublished).toBe(false);
    expect(unpublishAgentMock).toHaveBeenCalledWith('session-token', 'agent-1');
  });

  it('answers 401 when the user is not logged in', async () => {
    getSessionTokenMock.mockResolvedValue(null);

    expect((await DELETE(deleteRequest(), params)).status).toBe(401);
    expect(unpublishAgentMock).not.toHaveBeenCalled();
  });

  it('answers 403 when the user only collaborates on the agent', async () => {
    isAgentOwnerMock.mockResolvedValue(false);

    expect((await DELETE(deleteRequest(), params)).status).toBe(403);
    expect(unpublishAgentMock).not.toHaveBeenCalled();
  });
});
