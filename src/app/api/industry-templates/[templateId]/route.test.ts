// @vitest-environment node
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getSessionToken } from '@/lib/session-tokens';
import { deleteTemplate, getTemplate, RagdollError, updateTemplate } from '@/server/ragdoll';
import { DELETE, GET, PUT } from './route';

// The routes for one template are made by the same function for stillingsmaler and bransjemaler.
// These tests check that they only read, change or delete a template of their own type.
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
  id: 'industry-1',
  type: 'industry-template',
  name: 'Logistikk',
  description: 'Lager og transport.',
  content: { context: 'Truckførerbevis er vanlig.' },
};
const params = { params: Promise.resolve({ templateId: 'industry-1' }) };

function request(method: string, json?: unknown) {
  return new NextRequest('http://localhost/api/industry-templates/industry-1', {
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
});

afterEach(() => {
  vi.resetAllMocks();
});

describe('/api/industry-templates/[templateId]', () => {
  it('returns the bransjemal', async () => {
    const res = await GET(request('GET'), params);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      template: {
        id: 'industry-1',
        name: 'Logistikk',
        description: 'Lager og transport.',
        context: 'Truckførerbevis er vanlig.',
      },
    });
  });

  it('replaces the bransjemal', async () => {
    const res = await PUT(request('PUT', { name: 'Lager', description: 'Ny.' }), params);

    expect(res.status).toBe(200);
    expect(updateTemplateMock).toHaveBeenCalledWith('session-token', 'industry-1', {
      type: 'industry-template',
      name: 'Lager',
      description: 'Ny.',
      content: { context: '' },
    });
  });

  it('deletes the bransjemal', async () => {
    const res = await DELETE(request('DELETE'), params);

    expect(res.status).toBe(204);
    expect(deleteTemplateMock).toHaveBeenCalledWith('session-token', 'industry-1');
  });

  it('is 404 for a template of another type, and never changes or deletes it', async () => {
    getTemplateMock.mockResolvedValue({ ...stored, type: 'job-template' });

    expect((await GET(request('GET'), params)).status).toBe(404);
    expect((await PUT(request('PUT', { name: 'X', description: 'Y' }), params)).status).toBe(404);
    expect((await DELETE(request('DELETE'), params)).status).toBe(404);
    expect(updateTemplateMock).not.toHaveBeenCalled();
    expect(deleteTemplateMock).not.toHaveBeenCalled();
  });

  it('is 404 when RAGdoll has no such template', async () => {
    getTemplateMock.mockRejectedValue(new RagdollError('not-found', 'Not found'));

    expect((await DELETE(request('DELETE'), params)).status).toBe(404);
    expect(deleteTemplateMock).not.toHaveBeenCalled();
  });
});
