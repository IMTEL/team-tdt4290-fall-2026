import type { NextRequest } from 'next/server';

import { getSessionToken } from '@/lib/session-tokens';
import { ragdollErrorResponse } from '@/server/errorResponse';
import { getUserSettings, saveUserSettings } from '@/server/ragdoll';

/** The logged-in counsellor's settings for this app. Empty if none are saved. */
export async function GET(req: NextRequest) {
  const sessionToken = await getSessionToken(req);
  if (!sessionToken) {
    return Response.json({ error: 'Not signed in' }, { status: 401 });
  }

  try {
    return Response.json({ settings: await getUserSettings(sessionToken) });
  } catch (error) {
    return ragdollErrorResponse(error);
  }
}

/**
 * Replaces the logged-in counsellor's settings. No settings are defined yet, so any JSON object
 * is accepted; RAGdoll limits the size.
 */
export async function PUT(req: NextRequest) {
  const sessionToken = await getSessionToken(req);
  if (!sessionToken) {
    return Response.json({ error: 'Not signed in' }, { status: 401 });
  }

  let settings: unknown;
  try {
    settings = (await req.json())?.settings;
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (typeof settings !== 'object' || settings === null || Array.isArray(settings)) {
    return Response.json({ error: 'Invalid settings' }, { status: 400 });
  }

  try {
    const saved = await saveUserSettings(sessionToken, settings as Record<string, unknown>);
    return Response.json({ settings: saved });
  } catch (error) {
    return ragdollErrorResponse(error);
  }
}
