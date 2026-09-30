import { NextRequest, NextResponse } from 'next/server';
import { getSessionToken } from '@/lib/session-tokens';

// The folder name `[...path]` decides the param name below, so the two must match.
type RouteContext = { params: Promise<{ path: string[] }> };

/**
 * Forwards /api/backend/<path> to RAGdoll with the signed-in user's session token.
 * The browser never sees the token and never talks to RAGdoll directly (so no CORS).
 */
async function handle(req: NextRequest, { params }: RouteContext) {
  const sessionToken = await getSessionToken(req);
  if (!sessionToken) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const base = process.env.BACKEND_API_URL;
  if (!base) {
    return NextResponse.json({ error: 'BACKEND_API_URL is not set' }, { status: 500 });
  }

  const { path } = await params;
  const hasBody = !['GET', 'HEAD'].includes(req.method);
  const url = `${base.replace(/\/$/, '')}/${path.join('/')}${req.nextUrl.search}`;

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: req.method,
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        Accept: 'application/json',
        ...(hasBody
          ? { 'Content-Type': req.headers.get('content-type') ?? 'application/json' }
          : {}),
      },
      body: hasBody ? await req.text() : undefined,
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json({ error: 'Could not reach the backend' }, { status: 502 });
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('content-type') ?? 'application/json' },
  });
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
