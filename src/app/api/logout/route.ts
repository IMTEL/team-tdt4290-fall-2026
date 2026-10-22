import { NextRequest, NextResponse } from 'next/server';
import { getSessionJwt } from '@/lib/session-tokens';

/**
 * Returns the Keycloak URL that ends the Keycloak session. RAGdoll keeps no session of its own (it
 * checks the Keycloak token on every request), so there is nothing to revoke there. Clearing the
 * NextAuth cookie alone would leave Keycloak's session alive, and the next "Log in" would sign the
 * user straight back in without asking for a password.
 */
export async function POST(req: NextRequest) {
  const issuer = process.env.KEYCLOAK_ISSUER;
  if (!issuer) return NextResponse.json({ keycloakLogoutUrl: null });

  // Keycloak only redirects back if this URL is listed under the client's
  // "Valid post logout redirect URIs" (or that setting is `+`).
  const url = new URL(`${issuer.replace(/\/$/, '')}/protocol/openid-connect/logout`);
  const appUrl = process.env.NEXTAUTH_URL ?? req.nextUrl.origin;
  url.searchParams.set('post_logout_redirect_uri', new URL('/login', appUrl).href);
  const idToken = (await getSessionJwt(req))?.idToken;
  if (idToken) url.searchParams.set('id_token_hint', idToken);
  else url.searchParams.set('client_id', process.env.KEYCLOAK_CLIENT_ID ?? '');

  return NextResponse.json({ keycloakLogoutUrl: url.href });
}
