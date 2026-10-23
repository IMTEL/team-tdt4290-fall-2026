// @vitest-environment node
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getSessionToken } from '@/lib/session-tokens';
import { createTemplate, listTemplates, RagdollError } from '@/server/ragdoll';
import { GET, POST } from './route';

// The adapter and the mapper have their own tests. Here we only check what the route adds:
// the session check, validating the body, the template type, and the status codes.
vi.mock('@/lib/session-tokens', () => ({ getSessionToken: vi.fn() }));
vi.mock('@/server/ragdoll', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/server/ragdoll')>();
  return { ...original, listTemplates: vi.fn(), createTemplate: vi.fn() };
});

const getSessionTokenMock = vi.mocked(getSessionToken);
const listTemplatesMock = vi.mocked(listTemplates);
const createTemplateMock = vi.mocked(createTemplate);

const stored = {
  id: 'legal-1',
  type: 'legal-framework',
  name: 'Arbeidsmiljøloven § 9-3',
  description: 'Helseopplysninger',
  content: { text: 'Ikke spør om helse.' },
};
const template = {
  id: 'legal-1',
  title: 'Arbeidsmiljøloven § 9-3',
  description: 'Helseopplysninger',
  text: 'Ikke spør om helse.',
  builtIn: false,
};

function request(method: string, body?: unknown) {
  return new NextRequest('http://localhost/api/legal-templates', {
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

describe('GET /api/legal-templates', () => {
  it('lists the counsellor’s legal templates, by their own type', async () => {
    const res = await GET(request('GET'));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ templates: [template] });
    expect(listTemplatesMock).toHaveBeenCalledWith('session-token', 'legal-framework');
  });

  it('leaves out a template it cannot read', async () => {
    listTemplatesMock.mockResolvedValue([stored, { ...stored, id: 'broken', content: {} }]);

    expect(await (await GET(request('GET'))).json()).toEqual({ templates: [template] });
  });

  it('answers 401 without calling RAGdoll when signed out', async () => {
    getSessionTokenMock.mockResolvedValue(null);

    expect((await GET(request('GET'))).status).toBe(401);
    expect(listTemplatesMock).not.toHaveBeenCalled();
  });

  it('passes on a RAGdoll failure as a safe status', async () => {
    listTemplatesMock.mockRejectedValue(new RagdollError('timeout', 'slow'));

    expect((await GET(request('GET'))).status).toBe(504);
  });
});

describe('POST /api/legal-templates', () => {
  it('saves the legal template and answers 201 with it', async () => {
    const res = await POST(
      request('POST', {
        title: template.title,
        description: template.description,
        text: template.text,
      }),
    );

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ template });
    expect(createTemplateMock).toHaveBeenCalledWith('session-token', {
      type: 'legal-framework',
      name: template.title,
      description: template.description,
      content: { text: template.text },
    });
  });

  it('answers 400 without calling RAGdoll for an invalid body', async () => {
    expect((await POST(request('POST', { title: 'Bare et navn' }))).status).toBe(400);
    expect((await POST(request('POST', 'not json'))).status).toBe(400);
    expect(createTemplateMock).not.toHaveBeenCalled();
  });

  it('answers 401 without calling RAGdoll when signed out', async () => {
    getSessionTokenMock.mockResolvedValue(null);

    expect((await POST(request('POST', {}))).status).toBe(401);
    expect(createTemplateMock).not.toHaveBeenCalled();
  });
});
