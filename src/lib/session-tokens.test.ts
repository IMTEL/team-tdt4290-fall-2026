// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

import { refreshSession } from '@/lib/auth-options';
import { getSessionJwt, getSessionToken } from './session-tokens';

vi.mock('next-auth/jwt', () => ({ getToken: vi.fn() }));
vi.mock('@/lib/auth-options', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/auth-options')>();
  return { ...original, refreshSession: vi.fn() };
});

const NOW = new Date('2026-09-30T12:00:00Z').getTime();
const MINUTE = 60_000;
const getTokenMock = vi.mocked(getToken);
const refreshSessionMock = vi.mocked(refreshSession);
const req = new NextRequest('http://localhost/api/backend/agents');

describe('getSessionJwt', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    getTokenMock.mockReset();
  });

  it('decodes the NextAuth cookie with NEXTAUTH_SECRET', async () => {
    vi.stubEnv('NEXTAUTH_SECRET', 'top-secret');
    getTokenMock.mockResolvedValue({ sessionToken: 'session-1' });

    expect(await getSessionJwt(req)).toEqual({ sessionToken: 'session-1' });
    expect(getTokenMock).toHaveBeenCalledWith({ req, secret: 'top-secret' });
  });
});

describe('getSessionToken', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: NOW });
  });

  afterEach(() => {
    vi.useRealTimers();
    getTokenMock.mockReset();
    refreshSessionMock.mockReset();
  });

  it('returns null when the user is not signed in', async () => {
    getTokenMock.mockResolvedValue(null);

    expect(await getSessionToken(req)).toBeNull();
  });

  it('returns null when the cookie has no RAGdoll session token', async () => {
    getTokenMock.mockResolvedValue({ name: 'Kari' });

    expect(await getSessionToken(req)).toBeNull();
  });

  it('returns the session token while it is still valid', async () => {
    getTokenMock.mockResolvedValue({
      sessionToken: 'session-1',
      sessionTokenExpiry: NOW + 10 * MINUTE,
    });

    expect(await getSessionToken(req)).toBe('session-1');
    expect(refreshSessionMock).not.toHaveBeenCalled();
  });

  it('refreshes an expired session token for this request', async () => {
    const token = {
      sessionToken: 'session-1',
      refreshToken: 'refresh-1',
      sessionTokenExpiry: NOW - 1,
      refreshTokenExpiry: NOW + 60 * MINUTE,
    };
    getTokenMock.mockResolvedValue(token);
    refreshSessionMock.mockResolvedValue({ ...token, sessionToken: 'session-2' });

    expect(await getSessionToken(req)).toBe('session-2');
    expect(refreshSessionMock).toHaveBeenCalledWith(token);
  });

  it('returns null without calling RAGdoll when the refresh token has expired too', async () => {
    getTokenMock.mockResolvedValue({
      sessionToken: 'session-1',
      sessionTokenExpiry: NOW - 1,
      refreshTokenExpiry: NOW - 1,
    });

    expect(await getSessionToken(req)).toBeNull();
    expect(refreshSessionMock).not.toHaveBeenCalled();
  });

  it('returns null when the refresh fails', async () => {
    getTokenMock.mockResolvedValue({
      sessionToken: 'session-1',
      sessionTokenExpiry: NOW - 1,
      refreshTokenExpiry: NOW + 60 * MINUTE,
    });
    refreshSessionMock.mockRejectedValue(new Error('RAGdoll refresh failed: 401'));

    expect(await getSessionToken(req)).toBeNull();
  });
});
