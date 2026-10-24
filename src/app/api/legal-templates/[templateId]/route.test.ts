// @vitest-environment node
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getSessionToken } from '@/lib/session-tokens';
import { deleteTemplate, getTemplate, RagdollError, updateTemplate } from '@/server/ragdoll';
import { DELETE, GET, PUT } from './route';

// Here we check what the route adds: the session check, the body, and that it only reads,
// changes or deletes templates of the legal type.
vi.mock('@/lib/session-tokens', () => ({ getSessionToken: vi.fn() }));
vi.mock('@/server/ragdoll', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/server/ragdoll')>();
  return { ...original, getTemplate: vi.fn(), updateTemplate: vi.fn(), deleteTemplate: vi.fn() };
});

const getSessionTokenMock = vi.mocked(getSessionToken);
const getTemplateMock = vi.mocked(getTemplate);
const updateTemplateMock = vi.mocked(updateTemplate);
const deleteTemplateMock = vi.mocked(deleteTemplate);

const stored = {
  id: 'legal-1',
  type: 'legal-framework',
  name: 'Arbeidsmiljøloven § 9-3',
  description: 'Helseopplysninger',
  content: { text: 'Ikke spør om helse.' },
};
const interviewerTemplate = {
  id: 'legal-1',
  type: 'interviewer',
  name: 'Butikksjef',
  description: 'Vennlig',
  content: { focus: [], persona: 'En butikksjef' },
};
const body = { title: 'Ny tittel', description: 'Ny beskrivelse', text: 'Ny tekst' };
const params = { params: Promise.resolve({ templateId: 'legal-1' }) };

function request(method: string, json?: unknown) {
  return new NextRequest('http://localhost/api/legal-templates/legal-1', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: json === undefined ? undefined : JSON.stringify(json),
  });
}

beforeEach(() => {
  getSessionTokenMock.mockResolvedValue('session-token');
  getTemplateMock.mockResolvedValue(stored);
  updateTemplateMock.mockImplementation(async (_token, id, template) => ({ id, ...template }));
  deleteTemplateMock.mockResolvedValue();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  getSessionTokenMock.mockReset();
  getTemplateMock.mockReset();
  updateTemplateMock.mockReset();
  deleteTemplateMock.mockReset();
});

describe('GET /api/legal-templates/[templateId]', () => {
  it('gives the legal template', async () => {
    const res = await GET(request('GET'), params);

    expect(res.status).toBe(200);
    expect((await res.json()).template.title).toBe('Arbeidsmiljøloven § 9-3');
  });

  it('answers 404 for a template of another type, and for none', async () => {
    getTemplateMock.mockResolvedValueOnce(interviewerTemplate);
    expect((await GET(request('GET'), params)).status).toBe(404);

    getTemplateMock.mockRejectedValueOnce(new RagdollError('not-found', 'no template'));
    expect((await GET(request('GET'), params)).status).toBe(404);
  });

  it('answers 401 when signed out', async () => {
    getSessionTokenMock.mockResolvedValue(null);

    expect((await GET(request('GET'), params)).status).toBe(401);
    expect(getTemplateMock).not.toHaveBeenCalled();
  });
});

describe('PUT /api/legal-templates/[templateId]', () => {
  it('saves the changes and gives the template back', async () => {
    const res = await PUT(request('PUT', body), params);

    expect(res.status).toBe(200);
    expect((await res.json()).template).toEqual({ id: 'legal-1', ...body, builtIn: false });
    expect(updateTemplateMock).toHaveBeenCalledWith('session-token', 'legal-1', {
      type: 'legal-framework',
      name: body.title,
      description: body.description,
      content: { text: body.text },
    });
  });

  it('never overwrites a template of another type', async () => {
    getTemplateMock.mockResolvedValue(interviewerTemplate);

    expect((await PUT(request('PUT', body), params)).status).toBe(404);
    expect(updateTemplateMock).not.toHaveBeenCalled();
  });

  it('answers 400 for an invalid body', async () => {
    expect((await PUT(request('PUT', { title: '' }), params)).status).toBe(400);
    expect(updateTemplateMock).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/legal-templates/[templateId]', () => {
  it('deletes the legal template', async () => {
    const res = await DELETE(request('DELETE'), params);

    expect(res.status).toBe(204);
    expect(deleteTemplateMock).toHaveBeenCalledWith('session-token', 'legal-1');
  });

  it('never deletes a template of another type', async () => {
    getTemplateMock.mockResolvedValue(interviewerTemplate);

    expect((await DELETE(request('DELETE'), params)).status).toBe(404);
    expect(deleteTemplateMock).not.toHaveBeenCalled();
  });
});
