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
  refresh_token: 'keycloak-refresh-token',
  expires_at: NOW / 1000 + 5 * 60,
  refresh_expires_in: 30 * 60,
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
    vi.stubEnv('KEYCLOAK_ISSUER', 'https://keycloak.example/realms/iac/');
    vi.stubEnv('KEYCLOAK_CLIENT_ID', 'iac-frontend');
    vi.stubEnv('KEYCLOAK_CLIENT_SECRET', 'client-secret');
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
    it("keeps Keycloak's ID and refresh tokens with their expiry, without calling anyone", async () => {
      const token = await jwt({ token: { sub: 'user-1', name: 'Kari' }, account: keycloakAccount });

      expect(fetchMock).not.toHaveBeenCalled();
      expect(token).toEqual({
        sub: 'user-1',
        name: 'Kari',
        idToken: 'keycloak-id-token',
        refreshToken: 'keycloak-refresh-token',
        idTokenExpiry: NOW + 5 * MINUTE,
        refreshTokenExpiry: NOW + 30 * MINUTE,
      });
    });

    it('treats a refresh token without a lifetime (offline token) as not expiring', async () => {
      const token = await jwt({ account: { ...keycloakAccount, refresh_expires_in: 0 } });

      expect(token.refreshTokenExpiry).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('fails the sign-in when Keycloak sent no ID token, since RAGdoll needs it', async () => {
      await expect(jwt({ account: { ...keycloakAccount, id_token: undefined } })).rejects.toThrow(
        'Keycloak sent no ID token',
      );
    });
  });

  describe('jwt callback on later requests', () => {
    const signedIn: JWT = {
      idToken: 'id-1',
      refreshToken: 'refresh-1',
      idTokenExpiry: NOW + 10 * MINUTE,
      refreshTokenExpiry: NOW + 60 * MINUTE,
    };

    it('keeps the token as it is while the ID token is valid', async () => {
      const token = await jwt({ token: signedIn });

      expect(token).toBe(signedIn);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("refreshes an expired ID token at Keycloak's token endpoint", async () => {
      fetchMock.mockResolvedValue(
        Response.json({
          id_token: 'id-2',
          refresh_token: 'refresh-2',
          expires_in: 300,
          refresh_expires_in: 1800,
        }),
      );

      const token = await jwt({ token: { ...signedIn, idTokenExpiry: NOW - 1 } });

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://keycloak.example/realms/iac/protocol/openid-connect/token');
      expect(init?.method).toBe('POST');
      expect(Object.fromEntries(init?.body as URLSearchParams)).toEqual({
        grant_type: 'refresh_token',
        refresh_token: 'refresh-1',
        client_id: 'iac-frontend',
        client_secret: 'client-secret',
      });
      expect(token).toEqual({
        idToken: 'id-2',
        refreshToken: 'refresh-2',
        idTokenExpiry: NOW + 5 * MINUTE,
        refreshTokenExpiry: NOW + 30 * MINUTE,
      });
    });

    it('keeps the old refresh token when Keycloak did not rotate it', async () => {
      fetchMock.mockResolvedValue(Response.json({ id_token: 'id-2', expires_in: 300 }));

      const token = await jwt({ token: { ...signedIn, idTokenExpiry: NOW - 1 } });

      expect(token.refreshToken).toBe('refresh-1');
      expect(token.refreshTokenExpiry).toBe(NOW + 60 * MINUTE);
    });

    it('ends the session when the refresh token has expired too', async () => {
      await expect(
        jwt({ token: { ...signedIn, idTokenExpiry: NOW - 1, refreshTokenExpiry: NOW - 1 } }),
      ).rejects.toThrow('Refresh token expired');
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('session callback', () => {
    const baseSession: Session = {
      expires: '2026-10-01T00:00:00Z',
      user: { name: 'Keycloak Name', email: 'kari@example.no', image: null },
    };

    it('shows the name and picture, but never the tokens', async () => {
      const result = await session({
        session: structuredClone(baseSession),
        token: {
          name: 'Kari Nordmann',
          picture: 'https://img.example/kari.png',
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

    it('keeps the session name when the token has none', async () => {
      const result = await session({ session: structuredClone(baseSession), token: {} });

      expect(result.user?.name).toBe('Keycloak Name');
    });
  });
});

describe('refreshSession', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('KEYCLOAK_ISSUER', 'https://keycloak.example/realms/iac');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    fetchMock.mockReset();
  });

  it('throws when Keycloak refuses the refresh token', async () => {
    fetchMock.mockResolvedValue(new Response('expired', { status: 400 }));

    await expect(refreshSession({ refreshToken: 'old' })).rejects.toThrow(
      'Keycloak refresh failed: 400',
    );
  });

  it('throws when there is no refresh token to use', async () => {
    await expect(refreshSession({})).rejects.toThrow('No refresh token');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws when KEYCLOAK_ISSUER is not set', async () => {
    vi.stubEnv('KEYCLOAK_ISSUER', '');

    await expect(refreshSession({ refreshToken: 'old' })).rejects.toThrow(
      'KEYCLOAK_ISSUER is not set',
    );
  });
});
