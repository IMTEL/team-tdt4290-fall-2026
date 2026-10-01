// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

import { getSessionToken } from '@/lib/session-tokens';
import { DELETE, GET, POST } from './route';

// Reading and refreshing the cookie has its own tests (src/lib/session-tokens.test.ts).
vi.mock('@/lib/session-tokens', () => ({ getSessionToken: vi.fn() }));

const getSessionTokenMock = vi.mocked(getSessionToken);

// The route context Next.js passes in for /api/backend/<path joined by '/'>.
function proxied(path: string[]) {
  return { params: Promise.resolve({ path }) };
}

describe('/api/backend/[...path]', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('BACKEND_API_URL', 'https://ragdoll.example/');
    getSessionTokenMock.mockResolvedValue('session-1');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    fetchMock.mockReset();
    getSessionTokenMock.mockReset();
  });

  it('forwards a GET to RAGdoll with the session token and query string', async () => {
    fetchMock.mockResolvedValue(Response.json([{ id: 'a1' }]));
    const req = new NextRequest('http://localhost/api/backend/agents/?limit=5');

    const res = await GET(req, proxied(['agents', '']));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ id: 'a1' }]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://ragdoll.example/agents/?limit=5');
    expect(init).toMatchObject({
      method: 'GET',
      headers: { Authorization: 'Bearer session-1', Accept: 'application/json' },
      body: undefined,
      cache: 'no-store',
    });
  });

  it('forwards the body of a POST', async () => {
    fetchMock.mockResolvedValue(Response.json({ id: 'a2' }, { status: 201 }));
    const body = JSON.stringify({ name: 'Intervjuer' });
    const req = new NextRequest('http://localhost/api/backend/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    const res = await POST(req, proxied(['agents']));

    expect(res.status).toBe(201);
    const [, init] = fetchMock.mock.calls[0];
    expect(init?.body).toBe(body);
    expect(init?.headers).toMatchObject({ 'Content-Type': 'application/json' });
  });

  it("passes RAGdoll's error status on to the browser", async () => {
    fetchMock.mockResolvedValue(Response.json({ detail: 'Not found' }, { status: 404 }));
    const req = new NextRequest('http://localhost/api/backend/agents/x', { method: 'DELETE' });

    const res = await DELETE(req, proxied(['agents', 'x']));

    expect(res.status).toBe(404);
  });

  it('answers 401 without calling RAGdoll when the user is not signed in', async () => {
    getSessionTokenMock.mockResolvedValue(null);

    const res = await GET(
      new NextRequest('http://localhost/api/backend/agents'),
      proxied(['agents']),
    );

    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('answers 500 when BACKEND_API_URL is not set', async () => {
    vi.stubEnv('BACKEND_API_URL', '');

    const res = await GET(
      new NextRequest('http://localhost/api/backend/agents'),
      proxied(['agents']),
    );

    expect(res.status).toBe(500);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('answers 502 when RAGdoll cannot be reached', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    const res = await GET(
      new NextRequest('http://localhost/api/backend/agents'),
      proxied(['agents']),
    );

    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: 'Could not reach the backend' });
  });
});
