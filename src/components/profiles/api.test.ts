// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { deleteProfile, fetchProfile, fetchProfiles, saveProfile, updateProfile } from './api';

const profile = {
  label: 'Profil A',
  ageRange: '18-24' as const,
  experienceLevel: null,
  workExperience: '',
  education: '',
  languages: [],
  practiceAreas: ['Mestre nervøsitet'],
  notes: '',
};

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe('fetchProfiles', () => {
  it('returns the profiles', async () => {
    fetchMock.mockResolvedValue(Response.json({ profiles: [{ ...profile, id: 'profile-1' }] }));

    await expect(fetchProfiles()).resolves.toEqual([{ ...profile, id: 'profile-1' }]);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/profiles');
  });

  it('throws when a profile has the wrong shape', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ profiles: [{ ...profile, id: 'profile-1', ageRange: '33' }] }),
    );

    await expect(fetchProfiles()).rejects.toThrow('Noe gikk galt');
  });

  it('turns failures into Norwegian messages', async () => {
    fetchMock.mockResolvedValue(Response.json({ error: 'Not signed in' }, { status: 401 }));

    await expect(fetchProfiles()).rejects.toThrow('Du er logget ut');
  });
});

describe('fetchProfile', () => {
  it('returns null when the counsellor has no profile with that id', async () => {
    fetchMock.mockResolvedValue(Response.json({ error: 'Not found' }, { status: 404 }));

    await expect(fetchProfile('profile-1')).resolves.toBeNull();
    expect(fetchMock.mock.calls[0][0]).toBe('/api/profiles/profile-1');
  });
});

describe('saveProfile, updateProfile and deleteProfile', () => {
  it('post, put and delete the profile on the right routes', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ profile: { ...profile, id: 'profile-1' } }, { status: 201 }),
    );
    await expect(saveProfile(profile)).resolves.toBe('profile-1');
    expect(fetchMock.mock.calls[0][0]).toBe('/api/profiles');
    expect(fetchMock.mock.calls[0][1]?.method).toBe('POST');
    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toEqual(profile);

    fetchMock.mockResolvedValueOnce(Response.json({ profile: { ...profile, id: 'profile-1' } }));
    await updateProfile('profile-1', profile);
    expect(fetchMock.mock.calls[1][0]).toBe('/api/profiles/profile-1');
    expect(fetchMock.mock.calls[1][1]?.method).toBe('PUT');

    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await deleteProfile('profile-1');
    expect(fetchMock.mock.calls[2][1]?.method).toBe('DELETE');
  });

  it('say so when the profile is gone (404)', async () => {
    fetchMock.mockResolvedValue(Response.json({ error: 'Not found' }, { status: 404 }));

    await expect(updateProfile('profile-1', profile)).rejects.toThrow('Fant ikke profilen');
  });
});
