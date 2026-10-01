import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { signIn, signOut } from 'next-auth/react';

import { handleSignOut, keycloakRegister, keycloakSignIn } from './auth';

vi.mock('next-auth/react', () => ({ signIn: vi.fn(), signOut: vi.fn() }));

describe('keycloakSignIn', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('signs in with Keycloak and returns to the start page by default', () => {
    keycloakSignIn();

    expect(signIn).toHaveBeenCalledWith('keycloak', { callbackUrl: '/' });
  });

  it('returns to the given callback URL', () => {
    keycloakSignIn('/configure');

    expect(signIn).toHaveBeenCalledWith('keycloak', { callbackUrl: '/configure' });
  });
});

describe('keycloakRegister', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("opens Keycloak's registration form instead of the login form", () => {
    keycloakRegister('/browse-agents');

    expect(signIn).toHaveBeenCalledWith(
      'keycloak',
      { callbackUrl: '/browse-agents' },
      { prompt: 'create' },
    );
  });
});

describe('handleSignOut', () => {
  const fetchMock = vi.fn<typeof fetch>();
  const originalLocation = window.location;

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    // jsdom does not navigate, so swap `location` for a plain object we can read back.
    Object.defineProperty(window, 'location', { configurable: true, value: { href: '' } });
    vi.mocked(signOut).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    fetchMock.mockReset();
    vi.mocked(signOut).mockReset();
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
  });

  it('revokes the RAGdoll session, clears the NextAuth session and ends the Keycloak session', async () => {
    const keycloakLogoutUrl = 'https://keycloak.example/logout?id_token_hint=abc';
    fetchMock.mockResolvedValue(Response.json({ keycloakLogoutUrl }));

    await handleSignOut();

    expect(fetchMock).toHaveBeenCalledWith('/api/logout', { method: 'POST' });
    expect(signOut).toHaveBeenCalledWith({ redirect: false });
    expect(window.location.href).toBe(keycloakLogoutUrl);
  });

  it('goes to /login when there is no Keycloak logout URL', async () => {
    fetchMock.mockResolvedValue(Response.json({ keycloakLogoutUrl: null }));

    await handleSignOut();

    expect(signOut).toHaveBeenCalled();
    expect(window.location.href).toBe('/login');
  });

  it('still signs out and goes to /login when the logout route answers with an error', async () => {
    fetchMock.mockResolvedValue(new Response('boom', { status: 500 }));

    await handleSignOut();

    expect(signOut).toHaveBeenCalledWith({ redirect: false });
    expect(window.location.href).toBe('/login');
  });

  it('still signs out and goes to /login when the logout request fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await handleSignOut();

    expect(warn).toHaveBeenCalled();
    expect(signOut).toHaveBeenCalledWith({ redirect: false });
    expect(window.location.href).toBe('/login');
  });

  it('clears the NextAuth session before leaving the page', async () => {
    fetchMock.mockResolvedValue(Response.json({ keycloakLogoutUrl: 'https://kc/logout' }));
    vi.mocked(signOut).mockImplementation(async () => {
      expect(window.location.href).toBe('');
      return undefined;
    });

    await handleSignOut();

    expect(window.location.href).toBe('https://kc/logout');
  });
});
