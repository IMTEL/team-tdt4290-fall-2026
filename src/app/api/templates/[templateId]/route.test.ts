// @vitest-environment node
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getSessionToken } from '@/lib/session-tokens';
import { deleteTemplate, RagdollError } from '@/server/ragdoll';
import { DELETE } from './route';

vi.mock('@/lib/session-tokens', () => ({ getSessionToken: vi.fn() }));
vi.mock('@/server/ragdoll', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/server/ragdoll')>();
  return { ...original, deleteTemplate: vi.fn() };
});

const getSessionTokenMock = vi.mocked(getSessionToken);
const deleteTemplateMock = vi.mocked(deleteTemplate);

const request = () =>
  new NextRequest('http://localhost/api/templates/template-1', { method: 'DELETE' });
const params = { params: Promise.resolve({ templateId: 'template-1' }) };

beforeEach(() => {
  getSessionTokenMock.mockResolvedValue('session-token');
  deleteTemplateMock.mockResolvedValue(undefined);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  getSessionTokenMock.mockReset();
  deleteTemplateMock.mockReset();
});

describe('DELETE /api/templates/[templateId]', () => {
  it('deletes the template and answers 204', async () => {
    const res = await DELETE(request(), params);

    expect(res.status).toBe(204);
    expect(deleteTemplateMock).toHaveBeenCalledWith('session-token', 'template-1');
  });

  it('answers 404 when the counsellor has no template with that id', async () => {
    deleteTemplateMock.mockRejectedValue(new RagdollError('not-found', 'no template'));

    expect((await DELETE(request(), params)).status).toBe(404);
  });

  it('answers 401 without calling RAGdoll when signed out', async () => {
    getSessionTokenMock.mockResolvedValue(null);

    expect((await DELETE(request(), params)).status).toBe(401);
    expect(deleteTemplateMock).not.toHaveBeenCalled();
  });
});
