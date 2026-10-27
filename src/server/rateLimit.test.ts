// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest';

import {
  CHAT_WINDOW_MS,
  chatRetryAfter,
  MAX_CHAT_REQUESTS,
  resetChatLimits,
  tooManyRequestsResponse,
} from './rateLimit';

/** A JWT-shaped token with this `sub`. Only the payload is read, so the rest is filler. */
function idToken(sub: string, issuedAt: number): string {
  const payload = Buffer.from(JSON.stringify({ sub, iat: issuedAt })).toString('base64url');
  return `header.${payload}.signature`;
}

/** Sends `count` messages at `now` and returns the last answer. */
function send(token: string, count: number, now: number): number {
  let retryAfter = 0;
  for (let i = 0; i < count; i++) retryAfter = chatRetryAfter(token, now);
  return retryAfter;
}

beforeEach(() => {
  resetChatLimits();
});

describe('chatRetryAfter', () => {
  it('lets a user send up to the limit in one window', () => {
    expect(send('token', MAX_CHAT_REQUESTS, 0)).toBe(0);
  });

  it('refuses the next message and says how many seconds are left of the window', () => {
    send('token', MAX_CHAT_REQUESTS, 0);

    expect(chatRetryAfter('token', 15_000)).toBe(45);
  });

  it('lets the user send again when the window has ended', () => {
    send('token', MAX_CHAT_REQUESTS, 0);

    expect(chatRetryAfter('token', CHAT_WINDOW_MS)).toBe(0);
  });

  it('counts each user on their own', () => {
    send('first', MAX_CHAT_REQUESTS, 0);

    expect(chatRetryAfter('second', 0)).toBe(0);
  });

  it('counts a refreshed ID token as the same user', () => {
    send(idToken('user-1', 1), MAX_CHAT_REQUESTS, 0);

    expect(chatRetryAfter(idToken('user-1', 2), 1_000)).toBeGreaterThan(0);
    expect(chatRetryAfter(idToken('user-2', 2), 1_000)).toBe(0);
  });
});

describe('tooManyRequestsResponse', () => {
  it('answers 429 with Retry-After', async () => {
    const res = tooManyRequestsResponse(45);

    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('45');
    expect(await res.json()).toEqual({ error: 'Too many requests' });
  });
});
