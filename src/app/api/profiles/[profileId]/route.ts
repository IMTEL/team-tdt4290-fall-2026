import type { NextRequest } from 'next/server';

import { getSessionToken } from '@/lib/session-tokens';
import { ragdollErrorResponse } from '@/server/errorResponse';
import { fromRagdollProfile, parseNewProfile, toRagdollProfile } from '@/server/profileMapper';
import { deleteProfile, getProfile, updateProfile } from '@/server/ragdoll';

type Params = { params: Promise<{ profileId: string }> };

/** One of the logged-in counsellor's profiles. RAGdoll checks the owner. */
export async function GET(req: NextRequest, { params }: Params) {
  const sessionToken = await getSessionToken(req);
  if (!sessionToken) {
    return Response.json({ error: 'Not signed in' }, { status: 401 });
  }

  const { profileId } = await params;

  try {
    return Response.json({
      profile: fromRagdollProfile(await getProfile(sessionToken, profileId)),
    });
  } catch (error) {
    return ragdollErrorResponse(error);
  }
}

/** Replaces one of the logged-in counsellor's profiles and returns it. */
export async function PUT(req: NextRequest, { params }: Params) {
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

  const { profileId } = await params;

  try {
    const stored = await updateProfile(sessionToken, profileId, toRagdollProfile(profile));
    return Response.json({ profile: fromRagdollProfile(stored) });
  } catch (error) {
    return ragdollErrorResponse(error);
  }
}

/** Deletes one of the logged-in counsellor's profiles. RAGdoll checks the owner. */
export async function DELETE(req: NextRequest, { params }: Params) {
  const sessionToken = await getSessionToken(req);
  if (!sessionToken) {
    return Response.json({ error: 'Not signed in' }, { status: 401 });
  }

  const { profileId } = await params;

  try {
    await deleteProfile(sessionToken, profileId);
    return new Response(null, { status: 204 });
  } catch (error) {
    return ragdollErrorResponse(error);
  }
}
