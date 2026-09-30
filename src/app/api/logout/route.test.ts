// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

import { getSessionJwt, getSessionToken } from '@/lib/session-tokens';
import { POST } from './route';

// Reading and refreshing the cookie has its own tests (src/lib/session-tokens.test.ts).
vi.mock('@/lib/session-tokens', () => ({ getSessionJwt: vi.fn(), getSessionToken: vi.fn() }));

const getSessionTokenMock = vi.mocked(getSessionToken);
const getSessionJwtMock = vi.mocked(getSessionJwt);

const logoutRequest = () => new NextRequest('http://localhost:3000/api/logout', { method: 'POST' });

async function keycloakLogoutUrl(res: Response): Promise<URL | null> {
  const { keycloakLogoutUrl } = await res.json();
  return keycloakLogoutUrl ? new URL(keycloakLogoutUrl) : null;
}

describe('POST /api/logout', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('BACKEND_API_URL', 'https://ragdoll.example/');
    vi.stubEnv('KEYCLOAK_ISSUER', 'https://keycloak.example/realms/iac/');
    vi.stubEnv('KEYCLOAK_CLIENT_ID', 'iac-frontend');
    vi.stubEnv('NEXTAUTH_URL', 'https://iac.example');
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    fetchMock.mockReset();
    getSessionTokenMock.mockReset();
    getSessionJwtMock.mockReset();
  });

  it("revokes RAGdoll's session token", async () => {
    getSessionTokenMock.mockResolvedValue('session-1');

    await POST(logoutRequest());

    expect(fetchMock).toHaveBeenCalledWith('https://ragdoll.example/api/logout', {
      headers: { Authorization: 'Bearer session-1' },
      cache: 'no-store',
    });
  });

  it('returns the Keycloak logout URL with the ID token hint and a way back to /login', async () => {
    getSessionTokenMock.mockResolvedValue('session-1');
    getSessionJwtMock.mockResolvedValue({ idToken: 'keycloak-id-token' });

    const res = await POST(logoutRequest());

    expect(res.status).toBe(200);
    const url = await keycloakLogoutUrl(res);
    expect(url?.origin + url!.pathname).toBe(
      'https://keycloak.example/realms/iac/protocol/openid-connect/logout',
    );
    expect(url?.searchParams.get('post_logout_redirect_uri')).toBe('https://iac.example/login');
    expect(url?.searchParams.get('id_token_hint')).toBe('keycloak-id-token');
    expect(url?.searchParams.has('client_id')).toBe(false);
  });

  it('sends the client id instead when there is no ID token', async () => {
    getSessionTokenMock.mockResolvedValue(null);
    getSessionJwtMock.mockResolvedValue(null);

    const url = await keycloakLogoutUrl(await POST(logoutRequest()));

    expect(url?.searchParams.get('client_id')).toBe('iac-frontend');
    expect(url?.searchParams.has('id_token_hint')).toBe(false);
  });

  it('falls back to the request origin when NEXTAUTH_URL is not set', async () => {
    vi.stubEnv('NEXTAUTH_URL', undefined);
    getSessionJwtMock.mockResolvedValue(null);

    const url = await keycloakLogoutUrl(await POST(logoutRequest()));

    expect(url?.searchParams.get('post_logout_redirect_uri')).toBe('http://localhost:3000/login');
  });

  it('does not call RAGdoll when the user has no session token', async () => {
    getSessionTokenMock.mockResolvedValue(null);

    await POST(logoutRequest());

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('still ends the Keycloak session when RAGdoll cannot be reached', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    getSessionTokenMock.mockResolvedValue('session-1');
    getSessionJwtMock.mockResolvedValue({ idToken: 'keycloak-id-token' });
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    const res = await POST(logoutRequest());

    expect(res.status).toBe(200);
    expect(await keycloakLogoutUrl(res)).not.toBeNull();
  });

  it('returns no Keycloak URL when KEYCLOAK_ISSUER is not set', async () => {
    vi.stubEnv('KEYCLOAK_ISSUER', undefined);
    getSessionTokenMock.mockResolvedValue(null);

    const res = await POST(logoutRequest());

    expect(await res.json()).toEqual({ keycloakLogoutUrl: null });
  });
});
