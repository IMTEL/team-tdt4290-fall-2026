import type { NextRequest } from 'next/server';

import { getSessionToken } from '@/lib/session-tokens';
import { ragdollErrorResponse } from '@/server/errorResponse';
import { allowedModels } from '@/server/models';

/** The language models the logged-in counsellor can choose for an agent, by name. */
export async function GET(req: NextRequest) {
  const sessionToken = await getSessionToken(req);
  if (!sessionToken) {
    return Response.json({ error: 'Not signed in' }, { status: 401 });
  }

  try {
    return Response.json({ models: await allowedModels(sessionToken) });
  } catch (error) {
    return ragdollErrorResponse(error);
  }
}
