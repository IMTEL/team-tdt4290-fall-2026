// @vitest-environment node
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getSessionToken } from '@/lib/session-tokens';
import { createProfile, listProfiles, RagdollError } from '@/server/ragdoll';
import { GET, POST } from './route';

// The adapter and the mapper have their own tests. Here we only check what the route adds:
// the session check, validating the body, and the status codes.
vi.mock('@/lib/session-tokens', () => ({ getSessionToken: vi.fn() }));
vi.mock('@/server/ragdoll', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/server/ragdoll')>();
  return { ...original, listProfiles: vi.fn(), createProfile: vi.fn() };
});

const getSessionTokenMock = vi.mocked(getSessionToken);
const listProfilesMock = vi.mocked(listProfiles);
const createProfileMock = vi.mocked(createProfile);

const stored = {
  id: 'profile-1',
  label: 'Profil A',
  age_range: '18-24',
  experience_level: null,
  education: '',
  work_experience: '',
  languages: [],
  practice_areas: ['Mestre nervøsitet'],
  notes: '',
};
const profile = {
  id: 'profile-1',
  label: 'Profil A',
  ageRange: '18-24',
  experienceLevel: null,
  workExperience: '',
  education: '',
  languages: [],
  practiceAreas: ['Mestre nervøsitet'],
  notes: '',
};

function request(method: string, body?: unknown) {
  return new NextRequest('http://localhost/api/profiles', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  getSessionTokenMock.mockResolvedValue('session-token');
  listProfilesMock.mockResolvedValue([stored]);
  createProfileMock.mockResolvedValue(stored);
  // The route logs problems on purpose; keep the test output clean.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  getSessionTokenMock.mockReset();
  listProfilesMock.mockReset();
  createProfileMock.mockReset();
});

describe('GET /api/profiles', () => {
  it('lists the counsellor’s profiles', async () => {
    const res = await GET(request('GET'));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ profiles: [profile] });
    expect(listProfilesMock).toHaveBeenCalledWith('session-token');
  });

  it('answers 401 without calling RAGdoll when signed out', async () => {
    getSessionTokenMock.mockResolvedValue(null);

    expect((await GET(request('GET'))).status).toBe(401);
    expect(listProfilesMock).not.toHaveBeenCalled();
  });

  it('answers 502 when RAGdoll fails', async () => {
    listProfilesMock.mockRejectedValue(new RagdollError('unreachable', 'down'));

    expect((await GET(request('GET'))).status).toBe(502);
  });
});

describe('POST /api/profiles', () => {
  it('saves the profile with RAGdoll’s field names and returns it', async () => {
    const body = { ...profile, id: undefined };
    const res = await POST(request('POST', body));

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ profile });
    expect(createProfileMock).toHaveBeenCalledWith('session-token', { ...stored, id: undefined });
  });

  it.each([
    ['the JSON is broken', '{'],
    ['the label is missing', { ageRange: '18-24' }],
    ['the age range is not one we offer', { label: 'A', ageRange: '33' }],
  ])('answers 400 and saves nothing when %s', async (_case, body) => {
    expect((await POST(request('POST', body))).status).toBe(400);
    expect(createProfileMock).not.toHaveBeenCalled();
  });

  it('answers 401 when signed out', async () => {
    getSessionTokenMock.mockResolvedValue(null);

    expect((await POST(request('POST', { label: 'A' }))).status).toBe(401);
  });

  it('answers 502, not 401, when RAGdoll rejects the profile', async () => {
    createProfileMock.mockRejectedValue(new RagdollError('rejected', 'RAGdoll answered 422'));

    const res = await POST(request('POST', { label: 'A' }));

    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: 'RAGdoll rejected the request' });
  });
});
