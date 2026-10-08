// @vitest-environment node
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getSessionToken } from '@/lib/session-tokens';
import { getUserSettings, RagdollError, saveUserSettings } from '@/server/ragdoll';
import { GET, PUT } from './route';

vi.mock('@/lib/session-tokens', () => ({ getSessionToken: vi.fn() }));
vi.mock('@/server/ragdoll', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/server/ragdoll')>();
  return { ...original, getUserSettings: vi.fn(), saveUserSettings: vi.fn() };
});

const getSessionTokenMock = vi.mocked(getSessionToken);
const getUserSettingsMock = vi.mocked(getUserSettings);
const saveUserSettingsMock = vi.mocked(saveUserSettings);

function request(method: string, body?: unknown) {
  return new NextRequest('http://localhost/api/user-settings', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  getSessionTokenMock.mockResolvedValue('session-token');
  getUserSettingsMock.mockResolvedValue({ language: 'nb' });
  saveUserSettingsMock.mockImplementation(async (_token, settings) => settings);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  getSessionTokenMock.mockReset();
  getUserSettingsMock.mockReset();
  saveUserSettingsMock.mockReset();
});

describe('GET /api/user-settings', () => {
  it('returns the counsellor’s settings', async () => {
    const res = await GET(request('GET'));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ settings: { language: 'nb' } });
  });

  it('answers 401 without calling RAGdoll when signed out', async () => {
    getSessionTokenMock.mockResolvedValue(null);

    expect((await GET(request('GET'))).status).toBe(401);
    expect(getUserSettingsMock).not.toHaveBeenCalled();
  });

  it('answers 504 when RAGdoll times out', async () => {
    getUserSettingsMock.mockRejectedValue(new RagdollError('timeout', 'slow'));

    expect((await GET(request('GET'))).status).toBe(504);
  });
});

describe('PUT /api/user-settings', () => {
  it('saves the settings and returns them', async () => {
    const res = await PUT(request('PUT', { settings: { language: 'en' } }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ settings: { language: 'en' } });
    expect(saveUserSettingsMock).toHaveBeenCalledWith('session-token', { language: 'en' });
  });

  it.each([
    ['the JSON is broken', '{'],
    ['settings is missing', {}],
    ['settings is a list', { settings: ['en'] }],
  ])('answers 400 when %s', async (_case, body) => {
    expect((await PUT(request('PUT', body))).status).toBe(400);
    expect(saveUserSettingsMock).not.toHaveBeenCalled();
  });
});
