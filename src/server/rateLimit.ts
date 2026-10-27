// Limits how many chat messages one counsellor can send.s

/** How long one counting window lasts. */
export const CHAT_WINDOW_MS = 60_000;

/** How many chat messages one counsellor may send per window, configuration and test chat together. */
export const MAX_CHAT_REQUESTS = 30;

type Window = { start: number; count: number };

const windows = new Map<string, Window>();

/**
 * Counts one chat message for the user and returns how many seconds they must wait, or 0 if the
 * message may be sent now. A refused message is not counted.
 */
export function chatRetryAfter(sessionToken: string, now = Date.now()): number {
  forgetOldWindows(now);

  const user = userKey(sessionToken);
  const window = windows.get(user);
  if (!window || now - window.start >= CHAT_WINDOW_MS) {
    windows.set(user, { start: now, count: 1 });
    return 0;
  }
  if (window.count >= MAX_CHAT_REQUESTS) {
    return Math.ceil((window.start + CHAT_WINDOW_MS - now) / 1000);
  }
  window.count++;
  return 0;
}

/** The response for a user who has sent too many chat messages. */
export function tooManyRequestsResponse(retryAfter: number): Response {
  return Response.json(
    { error: 'Too many requests' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } },
  );
}

/** Forgets every count. Only for tests. */
export function resetChatLimits(): void {
  windows.clear();
}

/**
 * The same key for the same user, also after the ID token is refreshed: Keycloak's ID token is a
 * JWT whose `sub` is the user's id. It came from our own encrypted cookie, so it is not verified
 * again here. Anything that is not a JWT is used as it is.
 */
function userKey(sessionToken: string): string {
  try {
    const payload = JSON.parse(Buffer.from(sessionToken.split('.')[1], 'base64url').toString());
    if (typeof payload?.sub === 'string') return payload.sub;
  } catch {
    // Not a JWT.
  }
  return sessionToken;
}

/** Drops windows that have ended */
function forgetOldWindows(now: number): void {
  for (const [user, window] of windows) {
    if (now - window.start >= CHAT_WINDOW_MS) windows.delete(user);
  }
}
