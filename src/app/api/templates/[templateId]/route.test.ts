// @vitest-environment node
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getSessionToken } from '@/lib/session-tokens';
import { deleteTemplate, getTemplate, RagdollError, updateTemplate } from '@/server/ragdoll';
import { DELETE, GET, PUT } from './route';

// The adapter and the mapper have their own tests. Here we only check what the route adds:
// the session check, validating the body, and the status codes.
vi.mock('@/lib/session-tokens', () => ({ getSessionToken: vi.fn() }));
vi.mock('@/server/ragdoll', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/server/ragdoll')>();
  return {
    ...original,
    getTemplate: vi.fn(),
    updateTemplate: vi.fn(),
    deleteTemplate: vi.fn(),
  };
});

const getSessionTokenMock = vi.mocked(getSessionToken);
const getTemplateMock = vi.mocked(getTemplate);
const updateTemplateMock = vi.mocked(updateTemplate);
const deleteTemplateMock = vi.mocked(deleteTemplate);

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

function request(method: string, body?: unknown) {
  return new NextRequest('http://localhost/api/templates/template-1', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
}
const params = { params: Promise.resolve({ templateId: 'template-1' }) };

beforeEach(() => {
  getSessionTokenMock.mockResolvedValue('session-token');
  getTemplateMock.mockResolvedValue(stored);
  updateTemplateMock.mockResolvedValue(stored);
  deleteTemplateMock.mockResolvedValue(undefined);
  // The route logs problems on purpose; keep the test output clean.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  getSessionTokenMock.mockReset();
  getTemplateMock.mockReset();
  updateTemplateMock.mockReset();
  deleteTemplateMock.mockReset();
});

describe('GET /api/templates/[templateId]', () => {
  it('returns the template', async () => {
    const res = await GET(request('GET'), params);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ template: { ...template, id: 'template-1' } });
    expect(getTemplateMock).toHaveBeenCalledWith('session-token', 'template-1');
  });

  it('answers 404 when the counsellor has no template with that id', async () => {
    getTemplateMock.mockRejectedValue(new RagdollError('not-found', 'no template'));

    expect((await GET(request('GET'), params)).status).toBe(404);
  });

  it('answers 404 for a template that is not one of our interviewer templates', async () => {
    getTemplateMock.mockResolvedValue({ ...stored, type: 'other' });

    expect((await GET(request('GET'), params)).status).toBe(404);
  });

  it('answers 401 without calling RAGdoll when signed out', async () => {
    getSessionTokenMock.mockResolvedValue(null);

    expect((await GET(request('GET'), params)).status).toBe(401);
    expect(getTemplateMock).not.toHaveBeenCalled();
  });
});

describe('PUT /api/templates/[templateId]', () => {
  it('saves the changes to the same template and returns it', async () => {
    const res = await PUT(request('PUT', template), params);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ template: { ...template, id: 'template-1' } });
    expect(updateTemplateMock).toHaveBeenCalledWith('session-token', 'template-1', {
      type: 'interviewer',
      name: 'Butikksjef',
      description: 'Vennlig og direkte.',
      content: stored.content,
    });
  });

  it.each([
    ['the JSON is broken', '{'],
    ['the template is invalid', { ...template, persona: '' }],
  ])('answers 400 and saves nothing when %s', async (_case, body) => {
    expect((await PUT(request('PUT', body), params)).status).toBe(400);
    expect(updateTemplateMock).not.toHaveBeenCalled();
  });

  it('answers 404 when the template is gone', async () => {
    updateTemplateMock.mockRejectedValue(new RagdollError('not-found', 'no template'));

    expect((await PUT(request('PUT', template), params)).status).toBe(404);
  });

  it('answers 401 when signed out', async () => {
    getSessionTokenMock.mockResolvedValue(null);

    expect((await PUT(request('PUT', template), params)).status).toBe(401);
    expect(updateTemplateMock).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/templates/[templateId]', () => {
  it('deletes the template and answers 204', async () => {
    const res = await DELETE(request('DELETE'), params);

    expect(res.status).toBe(204);
    expect(deleteTemplateMock).toHaveBeenCalledWith('session-token', 'template-1');
  });

  it('answers 404 when the counsellor has no template with that id', async () => {
    deleteTemplateMock.mockRejectedValue(new RagdollError('not-found', 'no template'));

    expect((await DELETE(request('DELETE'), params)).status).toBe(404);
  });

  it('answers 401 without calling RAGdoll when signed out', async () => {
    getSessionTokenMock.mockResolvedValue(null);

    expect((await DELETE(request('DELETE'), params)).status).toBe(401);
    expect(deleteTemplateMock).not.toHaveBeenCalled();
  });
});
