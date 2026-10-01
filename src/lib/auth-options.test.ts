// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Account, Session } from 'next-auth';
import type { JWT } from 'next-auth/jwt';

import { authOptions, hasExpired, refreshSession } from './auth-options';

const NOW = new Date('2026-09-30T12:00:00Z').getTime();
const MINUTE = 60_000;

// The callbacks take more arguments than they use; only pass what matters to each test.
type JwtParams = Parameters<NonNullable<typeof authOptions.callbacks>['jwt'] & {}>[0];
type SessionParams = Parameters<NonNullable<typeof authOptions.callbacks>['session'] & {}>[0];
const jwt = (params: Partial<JwtParams>) =>
  authOptions.callbacks!.jwt!({ token: {}, ...params } as JwtParams);
const session = (params: Partial<SessionParams>) =>
  authOptions.callbacks!.session!(params as SessionParams);

const keycloakAccount = {
  provider: 'keycloak',
  type: 'oauth',
  providerAccountId: 'user-1',
  id_token: 'keycloak-id-token',
  access_token: 'keycloak-access-token',
} as Account;

describe('hasExpired', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: NOW });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('treats a missing expiry as expired', () => {
    expect(hasExpired(undefined)).toBe(true);
  });

  it('is false while the token has more than 30 seconds left', () => {
    expect(hasExpired(NOW + MINUTE)).toBe(false);
  });

  it('is true within the 30 second margin, so tokens do not run out mid-request', () => {
    expect(hasExpired(NOW + 20_000)).toBe(true);
  });

  it('is true once the expiry has passed', () => {
    expect(hasExpired(NOW - 1)).toBe(true);
  });
});

describe('authOptions', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.useFakeTimers({ now: NOW });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('BACKEND_API_URL', 'https://ragdoll.example/');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    fetchMock.mockReset();
  });

  it('uses JWT sessions and our own /login page for sign-in and errors', () => {
    expect(authOptions.session?.strategy).toBe('jwt');
    expect(authOptions.pages).toEqual({ signIn: '/login', error: '/login' });
    expect(authOptions.providers.map((p) => p.id)).toEqual(['keycloak']);
  });

  describe('jwt callback on first sign-in', () => {
    it("trades the Keycloak ID token for RAGdoll's tokens and stores them with their expiry", async () => {
      fetchMock.mockResolvedValue(
        Response.json({
          session_token: 'session-1',
          refresh_token: 'refresh-1',
          session_token_ttl: 15 * MINUTE,
          refresh_token_ttl: '86400000', // RAGdoll may send the TTLs as strings
          name: 'Kari Nordmann',
          picture: 'https://img.example/kari.png',
        }),
      );

      const token = await jwt({ token: { sub: 'user-1' }, account: keycloakAccount });

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://ragdoll.example/api/login');
      expect(init?.method).toBe('POST');
      expect(JSON.parse(init?.body as string)).toEqual({
        token: 'keycloak-id-token',
        provider: 'keycloak',
      });
      expect(token).toEqual({
        sub: 'user-1',
        sessionToken: 'session-1',
        refreshToken: 'refresh-1',
        sessionTokenExpiry: NOW + 15 * MINUTE,
        refreshTokenExpiry: NOW + 86_400_000,
        idToken: 'keycloak-id-token',
        name: 'Kari Nordmann',
        picture: 'https://img.example/kari.png',
      });
    });

    it('falls back to the access token when Keycloak sent no ID token', async () => {
      fetchMock.mockResolvedValue(
        Response.json({
          session_token: 's',
          refresh_token: 'r',
          session_token_ttl: MINUTE,
          refresh_token_ttl: MINUTE,
        }),
      );

      const token = await jwt({ account: { ...keycloakAccount, id_token: undefined } });

      expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string).token).toBe(
        'keycloak-access-token',
      );
      expect(token.name).toBeNull();
      expect(token.picture).toBeNull();
    });

    it('fails the sign-in when RAGdoll rejects the login', async () => {
      fetchMock.mockResolvedValue(new Response('nope', { status: 401 }));

      await expect(jwt({ account: keycloakAccount })).rejects.toThrow('RAGdoll login failed: 401');
    });

    it('fails the sign-in when BACKEND_API_URL is not set', async () => {
      vi.stubEnv('BACKEND_API_URL', '');

      await expect(jwt({ account: keycloakAccount })).rejects.toThrow('BACKEND_API_URL is not set');
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('jwt callback on later requests', () => {
    const signedIn: JWT = {
      sessionToken: 'session-1',
      refreshToken: 'refresh-1',
      sessionTokenExpiry: NOW + 10 * MINUTE,
      refreshTokenExpiry: NOW + 60 * MINUTE,
    };

    it('keeps the token as it is while the session token is valid', async () => {
      const token = await jwt({ token: signedIn });

      expect(token).toBe(signedIn);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('refreshes an expired session token with the refresh token', async () => {
      fetchMock.mockResolvedValue(
        Response.json({ session_token: 'session-2', session_token_ttl: 15 * MINUTE }),
      );

      const token = await jwt({ token: { ...signedIn, sessionTokenExpiry: NOW - 1 } });

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://ragdoll.example/api/refresh');
      expect(init?.headers).toEqual({ Authorization: 'Bearer refresh-1' });
      expect(token.sessionToken).toBe('session-2');
      expect(token.sessionTokenExpiry).toBe(NOW + 15 * MINUTE);
      expect(token.refreshToken).toBe('refresh-1');
    });

    it('ends the session when the refresh token has expired too', async () => {
      await expect(
        jwt({ token: { ...signedIn, sessionTokenExpiry: NOW - 1, refreshTokenExpiry: NOW - 1 } }),
      ).rejects.toThrow('Refresh token expired');
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('session callback', () => {
    const baseSession: Session = {
      expires: '2026-10-01T00:00:00Z',
      user: { name: 'Keycloak Name', email: 'kari@example.no', image: null },
    };

    it("shows RAGdoll's name and picture, but never the tokens", async () => {
      const result = await session({
        session: structuredClone(baseSession),
        token: {
          name: 'Kari Nordmann',
          picture: 'https://img.example/kari.png',
          sessionToken: 'secret-session',
          refreshToken: 'secret-refresh',
          idToken: 'secret-id',
        },
      });

      expect(result.user).toEqual({
        name: 'Kari Nordmann',
        email: 'kari@example.no',
        image: 'https://img.example/kari.png',
      });
      expect(JSON.stringify(result)).not.toMatch(/secret/);
    });

    it("keeps Keycloak's name when RAGdoll sent none", async () => {
      const result = await session({ session: structuredClone(baseSession), token: {} });

      expect(result.user?.name).toBe('Keycloak Name');
    });
  });
});

describe('refreshSession', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('BACKEND_API_URL', 'https://ragdoll.example');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    fetchMock.mockReset();
  });

  it('throws when RAGdoll refuses the refresh token', async () => {
    fetchMock.mockResolvedValue(new Response('expired', { status: 401 }));

    await expect(refreshSession({ refreshToken: 'old' })).rejects.toThrow(
      'RAGdoll refresh failed: 401',
    );
  });
});
