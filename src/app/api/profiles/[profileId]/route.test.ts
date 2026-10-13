// @vitest-environment node
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getSessionToken } from '@/lib/session-tokens';
import { deleteProfile, getProfile, RagdollError, updateProfile } from '@/server/ragdoll';
import { DELETE, GET, PUT } from './route';

vi.mock('@/lib/session-tokens', () => ({ getSessionToken: vi.fn() }));
vi.mock('@/server/ragdoll', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/server/ragdoll')>();
  return { ...original, getProfile: vi.fn(), updateProfile: vi.fn(), deleteProfile: vi.fn() };
});

const getSessionTokenMock = vi.mocked(getSessionToken);
const getProfileMock = vi.mocked(getProfile);
const updateProfileMock = vi.mocked(updateProfile);
const deleteProfileMock = vi.mocked(deleteProfile);

const stored = {
  id: 'profile-1',
  label: 'Profil A',
  age_range: null,
  experience_level: 'some',
  education: '',
  work_experience: '',
  languages: [],
  practice_areas: [],
  notes: '',
};

function request(method: string, body?: unknown) {
  return new NextRequest('http://localhost/api/profiles/profile-1', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
}
const params = { params: Promise.resolve({ profileId: 'profile-1' }) };

beforeEach(() => {
  getSessionTokenMock.mockResolvedValue('session-token');
  getProfileMock.mockResolvedValue(stored);
  updateProfileMock.mockResolvedValue(stored);
  deleteProfileMock.mockResolvedValue(undefined);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  getSessionTokenMock.mockReset();
  getProfileMock.mockReset();
  updateProfileMock.mockReset();
  deleteProfileMock.mockReset();
});

describe('GET /api/profiles/[profileId]', () => {
  it('returns the profile', async () => {
    const res = await GET(request('GET'), params);

    expect(res.status).toBe(200);
    expect((await res.json()).profile).toMatchObject({ id: 'profile-1', experienceLevel: 'some' });
    expect(getProfileMock).toHaveBeenCalledWith('session-token', 'profile-1');
  });

  it('answers 404 when the counsellor has no profile with that id', async () => {
    getProfileMock.mockRejectedValue(new RagdollError('not-found', 'no profile'));

    expect((await GET(request('GET'), params)).status).toBe(404);
  });

  it('answers 401 without calling RAGdoll when signed out', async () => {
    getSessionTokenMock.mockResolvedValue(null);

    expect((await GET(request('GET'), params)).status).toBe(401);
    expect(getProfileMock).not.toHaveBeenCalled();
  });
});

describe('PUT /api/profiles/[profileId]', () => {
  it('saves the changes to the same profile', async () => {
    const res = await PUT(request('PUT', { label: 'Profil B', experienceLevel: 'some' }), params);

    expect(res.status).toBe(200);
    expect(updateProfileMock).toHaveBeenCalledWith(
      'session-token',
      'profile-1',
      expect.objectContaining({ label: 'Profil B', experience_level: 'some' }),
    );
  });

  it('answers 400 and saves nothing for an invalid profile', async () => {
    expect((await PUT(request('PUT', { label: '' }), params)).status).toBe(400);
    expect(updateProfileMock).not.toHaveBeenCalled();
  });

  it('answers 404 when the profile is gone', async () => {
    updateProfileMock.mockRejectedValue(new RagdollError('not-found', 'no profile'));

    expect((await PUT(request('PUT', { label: 'A' }), params)).status).toBe(404);
  });
});

describe('DELETE /api/profiles/[profileId]', () => {
  it('deletes the profile and answers 204', async () => {
    const res = await DELETE(request('DELETE'), params);

    expect(res.status).toBe(204);
    expect(deleteProfileMock).toHaveBeenCalledWith('session-token', 'profile-1');
  });

  it('answers 404 when the counsellor has no profile with that id', async () => {
    deleteProfileMock.mockRejectedValue(new RagdollError('not-found', 'no profile'));

    expect((await DELETE(request('DELETE'), params)).status).toBe(404);
  });
});
