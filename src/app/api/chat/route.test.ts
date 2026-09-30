// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { askAgent, RagdollError, type RagdollErrorKind } from '@/server/ragdoll';
import { POST } from './route';

// The RAGdoll adapter has its own tests (src/server/ragdoll.test.ts). Here we only check
// what the route adds on top: validating the request and turning errors into status codes.
vi.mock('@/server/ragdoll', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/server/ragdoll')>();
  return { ...original, askAgent: vi.fn() };
});

const askAgentMock = vi.mocked(askAgent);

function chatRequest(body: unknown) {
  return new Request('http://localhost/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const validBody = { agent: 'configurator', messages: [{ role: 'user', content: 'Hei' }] };

describe('POST /api/chat', () => {
  beforeEach(() => {
    vi.stubEnv('RAGDOLL_CONFIGURATOR_AGENT_ID', 'configurator-123');
    vi.stubEnv('RAGDOLL_CONFIGURATOR_ACCESS_KEY', 'configurator-key');
    vi.stubEnv('RAGDOLL_INTERVIEWER_AGENT_ID', 'interviewer-456');
    vi.stubEnv('RAGDOLL_INTERVIEWER_ACCESS_KEY', 'interviewer-key');
    // The route logs upstream problems on purpose; keep the test output clean.
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    askAgentMock.mockReset();
  });

  it('asks the configurator agent and returns only the reply text', async () => {
    askAgentMock.mockResolvedValue('Hei! Hvilken stilling?');
    const messages = [
      { role: 'assistant', content: 'Hei!' },
      { role: 'user', content: 'Butikkmedarbeider' },
    ];

    const res = await POST(chatRequest({ agent: 'configurator', messages }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ response: 'Hei! Hvilken stilling?' });
    expect(askAgentMock).toHaveBeenCalledWith(
      { id: 'configurator-123', accessKey: 'configurator-key' },
      messages,
    );
  });

  it('asks the interviewer agent with its own settings', async () => {
    askAgentMock.mockResolvedValue('Hva i CV-en din er relevant for stillingen?');

    const res = await POST(chatRequest({ ...validBody, agent: 'interviewer' }));

    expect(res.status).toBe(200);
    expect(askAgentMock).toHaveBeenCalledWith(
      { id: 'interviewer-456', accessKey: 'interviewer-key' },
      validBody.messages,
    );
  });

  it.each([
    ['no agent', { messages: validBody.messages }],
    ['an unknown agent', { ...validBody, agent: 'recruiter' }],
    ['an inherited property as agent', { ...validBody, agent: 'toString' }],
    ['no messages field', { agent: 'configurator' }],
    ['an empty list', { agent: 'configurator', messages: [] }],
    [
      'a message with an unknown role',
      { agent: 'configurator', messages: [{ role: 'system', content: 'x' }] },
    ],
    ['a message without text', { agent: 'configurator', messages: [{ role: 'user' }] }],
    ['messages that are not a list', { agent: 'configurator', messages: 'Hei' }],
  ])('rejects %s with 400 and never calls RAGdoll', async (_, body) => {
    const res = await POST(chatRequest(body));

    expect(res.status).toBe(400);
    expect(askAgentMock).not.toHaveBeenCalled();
  });

  it('rejects a body that is not JSON with 400', async () => {
    const res = await POST(chatRequest('{oops'));

    expect(res.status).toBe(400);
    expect(askAgentMock).not.toHaveBeenCalled();
  });

  it('answers 500 for an agent whose settings are missing, and still serves the others', async () => {
    vi.stubEnv('RAGDOLL_INTERVIEWER_ACCESS_KEY', '');
    askAgentMock.mockResolvedValue('Hei!');

    const interviewer = await POST(chatRequest({ ...validBody, agent: 'interviewer' }));
    const configurator = await POST(chatRequest(validBody));

    expect(interviewer.status).toBe(500);
    expect(configurator.status).toBe(200);
    expect(askAgentMock).toHaveBeenCalledTimes(1);
  });

  it.each<[RagdollErrorKind, number]>([
    ['config', 500],
    ['timeout', 504],
    ['unreachable', 502],
    ['bad-response', 502],
  ])('answers a %s error from RAGdoll with %i', async (kind, status) => {
    askAgentMock.mockRejectedValue(new RagdollError(kind, 'RAGdoll said: Unauthorized'));

    const res = await POST(chatRequest(validBody));

    expect(res.status).toBe(status);
  });

  it('never passes RAGdoll’s error message on to the browser', async () => {
    askAgentMock.mockRejectedValue(
      new RagdollError('unreachable', 'RAGdoll answered 401: Unauthorized, check logs'),
    );

    const res = await POST(chatRequest(validBody));

    expect(JSON.stringify(await res.json())).not.toContain('Unauthorized');
  });

  it('answers 500 when something other than RAGdoll fails', async () => {
    askAgentMock.mockRejectedValue(new TypeError('Cannot read properties of undefined'));

    const res = await POST(chatRequest(validBody));

    expect(res.status).toBe(500);
  });
});
