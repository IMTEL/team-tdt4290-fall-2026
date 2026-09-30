import type { Account, AuthOptions } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import KeycloakProvider from 'next-auth/providers/keycloak';

declare module 'next-auth/jwt' {
  interface JWT {
    sessionToken?: string;
    refreshToken?: string;
    sessionTokenExpiry?: number;
    refreshTokenExpiry?: number;
    /** Keycloak's ID token, needed to end the Keycloak session on log out. */
    idToken?: string;
  }
}

/** What RAGdoll's POST /api/login returns. The TTLs are in milliseconds. */
interface LoginResponse {
  session_token: string;
  refresh_token: string;
  session_token_ttl: number | string;
  refresh_token_ttl: number | string;
  name?: string | null;
  picture?: string | null;
}

/** Treat tokens as expired a little early, so they do not run out while a request is in flight. */
const EXPIRY_MARGIN_MS = 30_000;

export function hasExpired(expiry: number | undefined): boolean {
  return !expiry || Date.now() > expiry - EXPIRY_MARGIN_MS;
}

function backendUrl(path: string): string {
  const base = process.env.BACKEND_API_URL;
  if (!base) throw new Error('BACKEND_API_URL is not set');
  return `${base.replace(/\/$/, '')}${path}`;
}

/** Trades the Keycloak token for RAGdoll's own session and refresh tokens. */
async function handleLogin(token: JWT, account: Account): Promise<JWT> {
  const res = await fetch(backendUrl('/api/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: account.id_token ?? account.access_token,
      provider: 'keycloak',
    }),
  });
  if (!res.ok) throw new Error(`RAGdoll login failed: ${res.status}`);

  const data = (await res.json()) as LoginResponse;
  return {
    ...token,
    sessionToken: data.session_token,
    refreshToken: data.refresh_token,
    sessionTokenExpiry: Date.now() + Number(data.session_token_ttl),
    refreshTokenExpiry: Date.now() + Number(data.refresh_token_ttl),
    idToken: account.id_token,
    name: data.name ?? null,
    picture: data.picture ?? null,
  };
}

/** Asks RAGdoll for a new session token, using the refresh token as the Bearer. */
export async function refreshSession(token: JWT): Promise<JWT> {
  const res = await fetch(backendUrl('/api/refresh'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token.refreshToken}` },
  });
  if (!res.ok) throw new Error(`RAGdoll refresh failed: ${res.status}`);

  const data = (await res.json()) as Pick<LoginResponse, 'session_token' | 'session_token_ttl'>;
  return {
    ...token,
    sessionToken: data.session_token,
    sessionTokenExpiry: Date.now() + Number(data.session_token_ttl),
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

      if (!hasExpired(token.sessionTokenExpiry)) return token;

      // Session token expired: refresh it, unless the refresh token has expired too.
      if (hasExpired(token.refreshTokenExpiry)) {
        throw new Error('Refresh token expired'); // ends the session, the user logs in again
      }
      return refreshSession(token);
    },
    async session({ session, token }) {
      // RAGdoll's tokens stay in the encrypted cookie; the browser only gets name and image.
      if (session.user) {
        session.user.name = token.name ?? session.user.name;
        session.user.image = token.picture ?? session.user.image;
      }
      return session;
    },
  },
  pages: { signIn: '/login', error: '/login' },
};
