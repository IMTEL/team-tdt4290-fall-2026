// @vitest-environment node
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getSessionToken } from '@/lib/session-tokens';
import { deleteTemplate, getTemplate, RagdollError, updateTemplate } from '@/server/ragdoll';
import { DELETE, GET, PUT } from './route';

// These tests check that the routes only read, change or delete a stillingsmal, never a template
// of another type.
vi.mock('@/lib/session-tokens', () => ({ getSessionToken: vi.fn() }));
vi.mock('@/server/ragdoll', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/server/ragdoll')>();
  return { ...original, getTemplate: vi.fn(), updateTemplate: vi.fn(), deleteTemplate: vi.fn() };
});

const getSessionTokenMock = vi.mocked(getSessionToken);
const getTemplateMock = vi.mocked(getTemplate);
const updateTemplateMock = vi.mocked(updateTemplate);
const deleteTemplateMock = vi.mocked(deleteTemplate);

const job = {
  title: 'Lagermedarbeider natt',
  industry: 'Logistikk',
  sector: 'privat',
  description: 'Plukk og pakking om natten.',
  tasks: ['Plukking'],
  jobDescription: 'Jobber på et stort lager om natten.',
};
const stored = {
  id: 'job-1',
  type: 'job-template',
  name: job.title,
  description: job.description,
  content: {
    industry: job.industry,
    sector: job.sector,
    tasks: job.tasks,
    jobDescription: job.jobDescription,
  },
};
const params = { params: Promise.resolve({ templateId: 'job-1' }) };

function request(method: string, json?: unknown) {
  return new NextRequest('http://localhost/api/job-templates/job-1', {
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

describe('/api/job-templates/[templateId]', () => {
  it('returns the stillingsmal', async () => {
    const res = await GET(request('GET'), params);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ template: { id: 'job-1', ...job } });
  });

  it('replaces the stillingsmal', async () => {
    const res = await PUT(request('PUT', { ...job, title: 'Truckfører' }), params);

    expect(res.status).toBe(200);
    expect(updateTemplateMock).toHaveBeenCalledWith('session-token', 'job-1', {
      type: 'job-template',
      name: 'Truckfører',
      description: job.description,
      content: stored.content,
    });
  });

  it('is 400 for a body that is not a stillingsmal', async () => {
    expect((await PUT(request('PUT', { ...job, sector: 'x' }), params)).status).toBe(400);
    expect(updateTemplateMock).not.toHaveBeenCalled();
  });

  it('deletes the stillingsmal', async () => {
    const res = await DELETE(request('DELETE'), params);

    expect(res.status).toBe(204);
    expect(deleteTemplateMock).toHaveBeenCalledWith('session-token', 'job-1');
  });

  it('is 404 for a template of another type, and never changes or deletes it', async () => {
    getTemplateMock.mockResolvedValue({ ...stored, type: 'interviewer' });

    expect((await GET(request('GET'), params)).status).toBe(404);
    expect((await PUT(request('PUT', job), params)).status).toBe(404);
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
