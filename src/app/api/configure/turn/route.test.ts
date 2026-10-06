// @vitest-environment node
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { findTemplate } from '@/data/interviewer-templates';
import { getSessionToken } from '@/lib/session-tokens';
import { askAgent, RagdollError } from '@/server/ragdoll';
import { POST } from './route';

// The adapter and parseConfiguration have their own tests. Here we only check what the route adds:
// the session check, validating the body, and reporting when the configuration is done with the
// interviewer from the chosen template.
vi.mock('@/lib/session-tokens', () => ({ getSessionToken: vi.fn() }));
vi.mock('@/server/ragdoll', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/server/ragdoll')>();
  return { ...original, askAgent: vi.fn() };
});

const getSessionTokenMock = vi.mocked(getSessionToken);
const askAgentMock = vi.mocked(askAgent);

const messages = [
  { role: 'assistant', content: 'Hei! Hvilken stilling skal jobbsøkeren øve til?' },
  { role: 'user', content: 'Butikkmedarbeider' },
];

const finalReply = `KONFIGURASJON
Stilling: Butikkmedarbeider
Bransje: Varehandel (privat)
Bedrift: Nærbutikken AS
Intervjutype: første intervju
Jobbsøker: under 25, lite erfaring
Vanskelighetsgrad: lett | Antall spørsmål: 6 | Oppfølgingsspørsmål: ja
Egne spørsmål: ingen`;

function turnRequest(body: unknown) {
  return new NextRequest('http://localhost/api/configure/turn', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  getSessionTokenMock.mockResolvedValue('session-token');
  vi.stubEnv('RAGDOLL_CONFIGURATOR_AGENT_ID', 'configurator-123');
  vi.stubEnv('RAGDOLL_CONFIGURATOR_ACCESS_KEY', 'configurator-key');
  // The route logs problems on purpose; keep the test output clean.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  getSessionTokenMock.mockReset();
  askAgentMock.mockReset();
});

describe('POST /api/configure/turn', () => {
  it('asks the configurator and reports that the configuration is not done yet', async () => {
    askAgentMock.mockResolvedValue('Hvilken bransje er stillingen i?');

    const res = await POST(turnRequest({ templateId: 'teamleder', messages }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      reply: 'Hvilken bransje er stillingen i?',
      configuration: null,
      done: false,
    });
    expect(askAgentMock).toHaveBeenCalledWith(
      { id: 'configurator-123', accessKey: 'configurator-key' },
      messages,
    );
  });

  it('returns the configuration, with the interviewer from the template, when the block is complete', async () => {
    askAgentMock.mockResolvedValue(finalReply);

    const res = await POST(turnRequest({ templateId: 'teamleder', messages }));
    const body = await res.json();

    expect(body.done).toBe(true);
    expect(body.configuration.stilling).toBe('Butikkmedarbeider');
    expect(body.configuration.intervjuer).toBe(findTemplate('teamleder')?.persona);
  });

  it('answers 401 and asks nothing when the user is not logged in', async () => {
    getSessionTokenMock.mockResolvedValue(null);

    const res = await POST(turnRequest({ templateId: 'teamleder', messages }));

    expect(res.status).toBe(401);
    expect(askAgentMock).not.toHaveBeenCalled();
  });

  it.each([
    ['the body is not JSON', '{not json'],
    ['messages is missing', { templateId: 'teamleder' }],
    ['messages is empty', { templateId: 'teamleder', messages: [] }],
    [
      'a message has an unknown role',
      { templateId: 'teamleder', messages: [{ role: 'system', content: 'Hei' }] },
    ],
    ['templateId is missing', { messages }],
    ['the template is unknown', { templateId: 'finnes-ikke', messages }],
  ])('answers 400 when %s', async (_case, body) => {
    const res = await POST(turnRequest(body));

    expect(res.status).toBe(400);
    expect(askAgentMock).not.toHaveBeenCalled();
  });

  it('answers 500 when the configurator agent is not configured', async () => {
    vi.stubEnv('RAGDOLL_CONFIGURATOR_ACCESS_KEY', '');

    const res = await POST(turnRequest({ templateId: 'teamleder', messages }));

    expect(res.status).toBe(500);
    expect(askAgentMock).not.toHaveBeenCalled();
  });

  it('turns a RAGdoll timeout into 504 without passing on its message', async () => {
    askAgentMock.mockRejectedValue(new RagdollError('timeout', 'secret internal detail'));

    const res = await POST(turnRequest({ templateId: 'teamleder', messages }));

    expect(res.status).toBe(504);
    expect(JSON.stringify(await res.json())).not.toContain('secret internal detail');
  });
});
