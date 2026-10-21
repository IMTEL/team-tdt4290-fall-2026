'use client';

import { signIn, signOut } from 'next-auth/react';

export const keycloakSignIn = (callbackUrl = '/') => signIn('keycloak', { callbackUrl });

/** Opens Keycloak's registration form instead of its login form. */
export const keycloakRegister = (callbackUrl = '/') =>
  signIn('keycloak', { callbackUrl }, { prompt: 'create' });

export async function handleSignOut() {
  let keycloakLogoutUrl: string | null = null;
  try {
    // Gives us the URL that ends the Keycloak session.
    const res = await fetch('/api/logout', { method: 'POST' });
    if (res.ok) ({ keycloakLogoutUrl } = await res.json());
  } catch (error) {
    console.warn('Logout request failed; clearing the frontend session anyway', error);
  }
  await signOut({ redirect: false });
  window.location.href = keycloakLogoutUrl ?? '/login';
}
