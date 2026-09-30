import type { NextRequest } from 'next/server';
import { getToken, type JWT } from 'next-auth/jwt';
import { hasExpired, refreshSession } from '@/lib/auth-options';

/** Reads the decrypted NextAuth cookie. Server-side only. */
export function getSessionJwt(req: NextRequest): Promise<JWT | null> {
  return getToken({ req, secret: process.env.NEXTAUTH_SECRET });
}

/**
 * Returns a valid RAGdoll session token for the signed-in user, or null. Server-side only.
 *
 * `getToken` only decodes the cookie and never runs the `jwt` callback, so an expired session
 * token is refreshed here. A route handler cannot update the cookie, so the new token is only used
 * for this request; the SessionProvider's regular polling stores a fresh one in the cookie.
 */
export async function getSessionToken(req: NextRequest): Promise<string | null> {
  const token = await getSessionJwt(req);
  if (!token?.sessionToken) return null;
  if (!hasExpired(token.sessionTokenExpiry)) return token.sessionToken;
  if (hasExpired(token.refreshTokenExpiry)) return null;

  try {
    return (await refreshSession(token)).sessionToken ?? null;
  } catch {
    return null;
  }
}
