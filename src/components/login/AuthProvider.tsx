'use client';

import { SessionProvider } from 'next-auth/react';

// RAGdoll's session token lives 15 minutes by default. Polling the session more often than that
// runs the `jwt` callback, which refreshes the token and stores it in the cookie.
const SESSION_REFETCH_SECONDS = 5 * 60;

/** Makes `useSession()` available in client components and keeps RAGdoll's token fresh. */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider refetchInterval={SESSION_REFETCH_SECONDS}>{children}</SessionProvider>;
}
