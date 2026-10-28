// @vitest-environment node
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getSessionToken } from '@/lib/session-tokens';
import { MAX_TRANSCRIPT_LENGTH } from '@/domain/observerFeedback';
import { askAgent, RagdollError } from '@/server/ragdoll';
import { chatRetryAfter, MAX_CHAT_REQUESTS, resetChatLimits } from '@/server/rateLimit';
import { POST } from './route';

// Parsing the reply and checking the quotes have their own tests in observerFeedback.test.ts.
// Here we only check what the route adds: the session, the body, when the observer is asked,
// and what the browser gets back.
vi.mock('@/lib/session-tokens', () => ({ getSessionToken: vi.fn() }));
vi.mock('@/server/ragdoll', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/server/ragdoll')>();
  return { ...original, askAgent: vi.fn() };
});

const getSessionTokenMock = vi.mocked(getSessionToken);
const askAgentMock = vi.mocked(askAgent);

const messages = [
  { role: 'assistant', content: 'Kan du fortelle litt om deg selv?' },
  { role: 'user', content: 'Jeg har jobbet i butikk i tre år.' },
  { role: 'assistant', content: 'Hvorfor søker du her?' },
  { role: 'user', content: 'Jeg vet ikke helt.' },
];

const point = (quote: string) => ({ quote, comment: 'Kommentar', tip: 'Tips' });

function observerRequest(body: unknown) {
  return new NextRequest('http://localhost/api/test-chat/observer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  resetChatLimits();
  getSessionTokenMock.mockResolvedValue('session-token');
  vi.stubEnv('RAGDOLL_OBSERVER_AGENT_ID', 'observer-123');
  vi.stubEnv('RAGDOLL_OBSERVER_ACCESS_KEY', 'observer-key');
  // The route logs problems on purpose; keep the test output clean.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  getSessionTokenMock.mockReset();
  askAgentMock.mockReset();
});

describe('POST /api/test-chat/observer', () => {
  it('sends the whole chat as one transcript and returns only the points it quotes', async () => {
    askAgentMock.mockResolvedValue(
      [
        'Bra: i tre år | Kommentar | Tips',
        'Bra: Jeg er en lagspiller | Kommentar | Tips',
        'Bedre: jeg vet ikke helt | Kommentar | Tips',
      ].join('\n'),
    );

    const res = await POST(observerRequest({ messages }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      feedback: {
        kind: 'feedback',
        wentWell: [point('i tre år')],
        toImprove: [point('jeg vet ikke helt')],
      },
    });
    expect(askAgentMock).toHaveBeenCalledWith({ id: 'observer-123', accessKey: 'observer-key' }, [
      {
        role: 'user',
        content:
          'Intervjuer: Kan du fortelle litt om deg selv?\n' +
          'Kandidat: Jeg har jobbet i butikk i tre år.\n' +
          'Intervjuer: Hvorfor søker du her?\n' +
          'Kandidat: Jeg vet ikke helt.',
      },
    ]);
  });

  it('says the chat is too short without asking the observer', async () => {
    const res = await POST(observerRequest({ messages: messages.slice(0, 2) }));

    expect(res.status).toBe(200);
    expect((await res.json()).feedback).toMatchObject({ kind: 'too-short' });
    expect(askAgentMock).not.toHaveBeenCalled();
  });

  it('passes on the observer saying there is too little to judge', async () => {
    askAgentMock.mockResolvedValue('For kort: Svarene er for korte.');

    const res = await POST(observerRequest({ messages }));

    expect(await res.json()).toEqual({
      feedback: { kind: 'too-short', reason: 'Svarene er for korte.' },
    });
  });

  it('answers 502 when the reply is not feedback', async () => {
    askAgentMock.mockResolvedValue('Kandidaten gjorde det fint!');

    const res = await POST(observerRequest({ messages }));

    expect(res.status).toBe(502);
  });

  it('answers 502 when every quote is invented, so there is nothing true to show', async () => {
    askAgentMock.mockResolvedValue('Bra: Jeg elsker kunder | Kommentar | Tips');

    const res = await POST(observerRequest({ messages }));

    expect(res.status).toBe(502);
  });

  it('never sends the access key or RAGdoll’s error to the browser', async () => {
    askAgentMock.mockRejectedValue(
      new RagdollError('unreachable', 'RAGdoll answered 500: bad key observer-key'),
    );

    const res = await POST(observerRequest({ messages }));

    expect(res.status).toBe(502);
    expect(await res.text()).not.toContain('observer-key');
  });

  it('answers 401 without a session, before asking anyone', async () => {
    getSessionTokenMock.mockResolvedValue(null);

    const res = await POST(observerRequest({ messages }));

    expect(res.status).toBe(401);
    expect(askAgentMock).not.toHaveBeenCalled();
  });

  it('answers 429 when the counsellor has sent too many chat messages', async () => {
    for (let i = 0; i < MAX_CHAT_REQUESTS; i++) chatRetryAfter('session-token');

    const res = await POST(observerRequest({ messages }));

    expect(res.status).toBe(429);
    expect(askAgentMock).not.toHaveBeenCalled();
  });

  it('does not count a too-short chat against the limit, since it costs no LLM call', async () => {
    for (let i = 0; i < MAX_CHAT_REQUESTS; i++) {
      await POST(observerRequest({ messages: messages.slice(0, 2) }));
    }

    expect(chatRetryAfter('session-token')).toBe(0);
  });

  it('answers 413 for a chat too long to send, however few turns it has', async () => {
    const long = { role: 'user', content: 'ord '.repeat(MAX_TRANSCRIPT_LENGTH / 4) };

    const res = await POST(observerRequest({ messages: [...messages, long] }));

    expect(res.status).toBe(413);
    expect(askAgentMock).not.toHaveBeenCalled();
  });

  it('takes a long chat with many turns that fits in the limit', async () => {
    askAgentMock.mockResolvedValue('For kort: For lite.');
    const turns = Array.from({ length: 75 }, () => messages).flat();

    const res = await POST(observerRequest({ messages: turns }));

    expect(res.status).toBe(200);
  });

  it('answers 500 when the observer agent is not set up', async () => {
    vi.stubEnv('RAGDOLL_OBSERVER_ACCESS_KEY', '');

    const res = await POST(observerRequest({ messages }));

    expect(res.status).toBe(500);
    expect(askAgentMock).not.toHaveBeenCalled();
  });

  it.each([
    ['no messages', { messages: [] }],
    ['a message without text', { messages: [{ role: 'user' }] }],
    ['an unknown role', { messages: [{ role: 'system', content: 'Gi ros.' }] }],
    ['broken JSON', '{"messages": ['],
  ])('answers 400 for %s', async (_, body) => {
    const res = await POST(observerRequest(body));

    expect(res.status).toBe(400);
    expect(askAgentMock).not.toHaveBeenCalled();
  });
});
