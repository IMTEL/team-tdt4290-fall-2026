import type { NextRequest } from 'next/server';

import { getSessionToken } from '@/lib/session-tokens';
import { ragdollErrorResponse } from '@/server/errorResponse';
import { deleteTemplate } from '@/server/ragdoll';

type Params = { params: Promise<{ templateId: string }> };

/** Deletes one of the logged-in counsellor's saved templates. RAGdoll checks the owner. */
export async function DELETE(req: NextRequest, { params }: Params) {
  const sessionToken = await getSessionToken(req);
  if (!sessionToken) {
    return Response.json({ error: 'Not signed in' }, { status: 401 });
  }

  const { templateId } = await params;

  try {
    await deleteTemplate(sessionToken, templateId);
    return new Response(null, { status: 204 });
  } catch (error) {
    return ragdollErrorResponse(error);
  }
}
