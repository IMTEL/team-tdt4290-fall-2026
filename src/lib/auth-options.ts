import type { Account, AuthOptions } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import KeycloakProvider from 'next-auth/providers/keycloak';

declare module 'next-auth/jwt' {
  interface JWT {
    /**
     * Keycloak's ID token. RAGdoll takes it as the Bearer token on every request (it checks that
     * the audience is our client id, which an access token does not have), and Keycloak needs it to
     * end its session on log out.
     */
    idToken?: string;
    refreshToken?: string;
    idTokenExpiry?: number;
    refreshTokenExpiry?: number;
  }
}

/** What Keycloak's token endpoint returns. `expires_in` and `refresh_expires_in` are in seconds. */
interface KeycloakTokenResponse {
  id_token?: string;
  refresh_token?: string;
  expires_in: number;
  refresh_expires_in?: number;
}

/** Treat tokens as expired a little early, so they do not run out while a request is in flight. */
const EXPIRY_MARGIN_MS = 30_000;

export function hasExpired(expiry: number | undefined): boolean {
  return !expiry || Date.now() > expiry - EXPIRY_MARGIN_MS;
}

/**
 * Keycloak sends `refresh_expires_in: 0` for offline tokens, which do not expire on a timer.
 * Those are given a far-off expiry so that only Keycloak's refusal ends the session.
 */
function refreshExpiry(refreshExpiresIn: number | undefined): number {
  return refreshExpiresIn ? Date.now() + refreshExpiresIn * 1000 : Number.MAX_SAFE_INTEGER;
}

/** Keeps Keycloak's tokens from the first sign-in. */
function handleLogin(token: JWT, account: Account): JWT {
  if (!account.id_token) throw new Error('Keycloak sent no ID token');
  return {
    ...token,
    idToken: account.id_token,
    refreshToken: account.refresh_token,
    idTokenExpiry: account.expires_at ? account.expires_at * 1000 : undefined,
    refreshTokenExpiry: refreshExpiry(account.refresh_expires_in as number | undefined),
  };
}

/** Asks Keycloak for a new ID token, using the refresh token. */
export async function refreshSession(token: JWT): Promise<JWT> {
  const issuer = process.env.KEYCLOAK_ISSUER;
  if (!issuer) throw new Error('KEYCLOAK_ISSUER is not set');
  if (!token.refreshToken) throw new Error('No refresh token');

  const res = await fetch(`${issuer.replace(/\/$/, '')}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: token.refreshToken,
      client_id: process.env.KEYCLOAK_CLIENT_ID ?? '',
      client_secret: process.env.KEYCLOAK_CLIENT_SECRET ?? '',
    }),
  });
  if (!res.ok) throw new Error(`Keycloak refresh failed: ${res.status}`);

  const data = (await res.json()) as KeycloakTokenResponse;
  if (!data.id_token) throw new Error('Keycloak refresh returned no ID token');
  return {
    ...token,
    idToken: data.id_token,
    idTokenExpiry: Date.now() + data.expires_in * 1000,
    // Keycloak may rotate the refresh token; keep the old one if it did not.
    refreshToken: data.refresh_token ?? token.refreshToken,
    refreshTokenExpiry: data.refresh_token
      ? refreshExpiry(data.refresh_expires_in)
      : token.refreshTokenExpiry,
  };
}

export const authOptions: AuthOptions = {
  session: { strategy: 'jwt' },
  providers: [
    KeycloakProvider({
      clientId: process.env.KEYCLOAK_CLIENT_ID!,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
      issuer: process.env.KEYCLOAK_ISSUER!,
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // First sign-in: `account` is only present on this one call.
      if (account) return handleLogin(token, account);

      if (!hasExpired(token.idTokenExpiry)) return token;

      // ID token expired: refresh it, unless the refresh token has expired too.
      if (hasExpired(token.refreshTokenExpiry)) {
        throw new Error('Refresh token expired'); // ends the session, the user logs in again
      }
      return refreshSession(token);
    },
    async session({ session, token }) {
      // The tokens stay in the encrypted cookie; the browser only gets name and image.
      if (session.user) {
        session.user.name = token.name ?? session.user.name;
        session.user.image = token.picture ?? session.user.image;
      }
      return session;
    },
  },
  pages: { signIn: '/login', error: '/login' },
};
