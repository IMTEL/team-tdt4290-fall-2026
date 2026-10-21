// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

import { getSessionJwt } from '@/lib/session-tokens';
import { POST } from './route';

// Reading and refreshing the cookie has its own tests (src/lib/session-tokens.test.ts).
vi.mock('@/lib/session-tokens', () => ({ getSessionJwt: vi.fn() }));

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
    vi.stubEnv('KEYCLOAK_ISSUER', 'https://keycloak.example/realms/iac/');
    vi.stubEnv('KEYCLOAK_CLIENT_ID', 'iac-frontend');
    vi.stubEnv('NEXTAUTH_URL', 'https://iac.example');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    fetchMock.mockReset();
    getSessionJwtMock.mockReset();
  });

  it('does not call RAGdoll, which keeps no session of its own', async () => {
    getSessionJwtMock.mockResolvedValue({ idToken: 'keycloak-id-token' });

    await POST(logoutRequest());

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns the Keycloak logout URL with the ID token hint and a way back to /login', async () => {
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

  it('returns no Keycloak URL when KEYCLOAK_ISSUER is not set', async () => {
    vi.stubEnv('KEYCLOAK_ISSUER', undefined);

    const res = await POST(logoutRequest());

    expect(await res.json()).toEqual({ keycloakLogoutUrl: null });
  });
});
