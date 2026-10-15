// @vitest-environment node
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getSessionToken } from '@/lib/session-tokens';
import { createTemplate, listTemplates, RagdollError } from '@/server/ragdoll';
import { GET, POST } from './route';

// The adapter and the mapper have their own tests. Here we only check what the route adds:
// the session check, validating the body, and the status codes.
vi.mock('@/lib/session-tokens', () => ({ getSessionToken: vi.fn() }));
vi.mock('@/server/ragdoll', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/server/ragdoll')>();
  return { ...original, listTemplates: vi.fn(), createTemplate: vi.fn() };
});

const getSessionTokenMock = vi.mocked(getSessionToken);
const listTemplatesMock = vi.mocked(listTemplates);
const createTemplateMock = vi.mocked(createTemplate);

const template = {
  agentType: 'interviewer',
  title: 'Butikksjef',
  description: 'Vennlig og direkte.',
  focus: ['Service'],
  persona: 'Intervjueren er butikksjef.',
};
const stored = {
  id: 'template-1',
  type: 'interviewer',
  name: 'Butikksjef',
  description: 'Vennlig og direkte.',
  content: { focus: ['Service'], persona: 'Intervjueren er butikksjef.' },
};

function request(method: string, body?: unknown, query = '') {
  return new NextRequest(`http://localhost/api/templates${query}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  getSessionTokenMock.mockResolvedValue('session-token');
  listTemplatesMock.mockResolvedValue([stored]);
  createTemplateMock.mockResolvedValue(stored);
  // The route logs problems on purpose; keep the test output clean.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  getSessionTokenMock.mockReset();
  listTemplatesMock.mockReset();
  createTemplateMock.mockReset();
});

describe('GET /api/templates', () => {
  it('lists the counsellor’s templates for the agent type asked for', async () => {
    const res = await GET(request('GET', undefined, '?agentType=interviewer'));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ templates: [{ ...template, id: 'template-1' }] });
    expect(listTemplatesMock).toHaveBeenCalledWith('session-token', 'interviewer');
  });

  it.each([
    ['unknown', 'finnes-ikke'],
    ['only planned', 'teacher'],
  ])('answers 400 without calling RAGdoll when the agent type is %s', async (_case, agentType) => {
    const res = await GET(request('GET', undefined, `?agentType=${agentType}`));

    expect(res.status).toBe(400);
    expect(listTemplatesMock).not.toHaveBeenCalled();
  });

  it('lists the templates of every agent type templates can be made for without a type', async () => {
    const res = await GET(request('GET'));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ templates: [{ ...template, id: 'template-1' }] });
    expect(listTemplatesMock).toHaveBeenCalledWith('session-token', 'interviewer');
  });

  it('leaves out templates it cannot read', async () => {
    listTemplatesMock.mockResolvedValue([stored, { ...stored, id: 'broken', content: {} }]);

    const data = await (await GET(request('GET'))).json();

    expect(data.templates.map((t: { id: string }) => t.id)).toEqual(['template-1']);
  });

  it('answers 401 without calling RAGdoll when signed out', async () => {
    getSessionTokenMock.mockResolvedValue(null);

    expect((await GET(request('GET'))).status).toBe(401);
    expect(listTemplatesMock).not.toHaveBeenCalled();
  });

  it('answers 502 when RAGdoll fails', async () => {
    listTemplatesMock.mockRejectedValue(new RagdollError('unreachable', 'down'));

    expect((await GET(request('GET'))).status).toBe(502);
  });
});

describe('POST /api/templates', () => {
  it('saves the template as an interviewer template and returns it', async () => {
    const res = await POST(request('POST', template));

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ template: { ...template, id: 'template-1' } });
    expect(createTemplateMock).toHaveBeenCalledWith('session-token', {
      type: 'interviewer',
      name: 'Butikksjef',
      description: 'Vennlig og direkte.',
      content: stored.content,
    });
  });

  it.each([
    ['the JSON is broken', '{'],
    ['the template is invalid', { ...template, title: '' }],
  ])('answers 400 when %s', async (_case, body) => {
    expect((await POST(request('POST', body))).status).toBe(400);
    expect(createTemplateMock).not.toHaveBeenCalled();
  });

  it('answers 401 when signed out', async () => {
    getSessionTokenMock.mockResolvedValue(null);

    expect((await POST(request('POST', template))).status).toBe(401);
  });
});
