// @vitest-environment node
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getSessionToken } from '@/lib/session-tokens';
import { createTemplate, listTemplates } from '@/server/ragdoll';
import { GET, POST } from './route';

// The routes are made by the shared functions in savedTemplateRoutes.ts. These tests check what
// they add for stillingsmaler: the session check, the body, the type and the status codes.
vi.mock('@/lib/session-tokens', () => ({ getSessionToken: vi.fn() }));
vi.mock('@/server/ragdoll', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/server/ragdoll')>();
  return { ...original, listTemplates: vi.fn(), createTemplate: vi.fn() };
});

const getSessionTokenMock = vi.mocked(getSessionToken);
const listTemplatesMock = vi.mocked(listTemplates);
const createTemplateMock = vi.mocked(createTemplate);

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
    industry: 'Logistikk',
    sector: 'privat',
    tasks: ['Plukking'],
    jobDescription: job.jobDescription,
  },
};

function request(method: string, body?: unknown) {
  return new NextRequest('http://localhost/api/job-templates', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  getSessionTokenMock.mockResolvedValue('session-token');
  listTemplatesMock.mockResolvedValue([stored]);
  createTemplateMock.mockResolvedValue(stored);
});

afterEach(() => {
  vi.resetAllMocks();
});

describe('GET /api/job-templates', () => {
  it('lists the counsellor’s stillingsmaler, by their own type, leaving out broken ones', async () => {
    listTemplatesMock.mockResolvedValue([stored, { ...stored, id: 'broken', content: {} }]);
    const res = await GET(request('GET'));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ templates: [{ id: 'job-1', ...job }] });
    expect(listTemplatesMock).toHaveBeenCalledWith('session-token', 'job-template');
  });

  it('is 401 when not signed in', async () => {
    getSessionTokenMock.mockResolvedValue(null);
    expect((await GET(request('GET'))).status).toBe(401);
    expect(listTemplatesMock).not.toHaveBeenCalled();
  });
});

describe('POST /api/job-templates', () => {
  it('saves the stillingsmal with its own type and returns it', async () => {
    const res = await POST(request('POST', job));

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ template: { id: 'job-1', ...job } });
    expect(createTemplateMock).toHaveBeenCalledWith('session-token', {
      type: 'job-template',
      name: job.title,
      description: job.description,
      content: stored.content,
    });
  });

  it('is 400 for a body that is not JSON or not a stillingsmal', async () => {
    expect((await POST(request('POST', '{'))).status).toBe(400);
    expect((await POST(request('POST', { ...job, title: '' }))).status).toBe(400);
    expect(createTemplateMock).not.toHaveBeenCalled();
  });
});
