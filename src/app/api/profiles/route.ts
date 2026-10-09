import type { NextRequest } from 'next/server';

import { getSessionToken } from '@/lib/session-tokens';
import { ragdollErrorResponse } from '@/server/errorResponse';
import { fromRagdollProfile, parseNewProfile, toRagdollProfile } from '@/server/profileMapper';
import { createProfile, listProfiles } from '@/server/ragdoll';

/** Lists the logged-in counsellor's job seeker profiles. Nobody else can see them. */
export async function GET(req: NextRequest) {
  const sessionToken = await getSessionToken(req);
  if (!sessionToken) {
    return Response.json({ error: 'Not signed in' }, { status: 401 });
  }

  try {
    const profiles = (await listProfiles(sessionToken)).map(fromRagdollProfile);
    return Response.json({ profiles });
  } catch (error) {
    return ragdollErrorResponse(error);
  }
}

/** Saves a new job seeker profile, owned by the logged-in counsellor. Returns it with its id. */
export async function POST(req: NextRequest) {
  const sessionToken = await getSessionToken(req);
  if (!sessionToken) {
    return Response.json({ error: 'Not signed in' }, { status: 401 });
  }

  let profile;
  try {
    profile = parseNewProfile(await req.json());
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!profile) {
    return Response.json({ error: 'Invalid profile' }, { status: 400 });
  }

  try {
    const stored = await createProfile(sessionToken, toRagdollProfile(profile));
    return Response.json({ profile: fromRagdollProfile(stored) }, { status: 201 });
  } catch (error) {
    return ragdollErrorResponse(error);
  }
}
