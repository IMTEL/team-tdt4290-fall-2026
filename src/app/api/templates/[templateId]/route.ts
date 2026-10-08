import type { NextRequest } from 'next/server';

import { getSessionToken } from '@/lib/session-tokens';
import { ragdollErrorResponse } from '@/server/errorResponse';
import { deleteTemplate, getTemplate, updateTemplate } from '@/server/ragdoll';
import { fromRagdollTemplate, parseNewTemplate, toRagdollTemplate } from '@/server/templateMapper';

type Params = { params: Promise<{ templateId: string }> };

/** One of the logged-in counsellor's saved templates. RAGdoll checks the owner. */
export async function GET(req: NextRequest, { params }: Params) {
  const sessionToken = await getSessionToken(req);
  if (!sessionToken) {
    return Response.json({ error: 'Not signed in' }, { status: 401 });
  }

  const { templateId } = await params;

  try {
    const template = fromRagdollTemplate(await getTemplate(sessionToken, templateId));
    // A template of another type, or one we can't read, is not one of ours.
    if (!template) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }
    return Response.json({ template });
  } catch (error) {
    return ragdollErrorResponse(error);
  }
}

/** Replaces one of the logged-in counsellor's saved templates and returns it. */
export async function PUT(req: NextRequest, { params }: Params) {
  const sessionToken = await getSessionToken(req);
  if (!sessionToken) {
    return Response.json({ error: 'Not signed in' }, { status: 401 });
  }

  let template;
  try {
    template = parseNewTemplate(await req.json());
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!template) {
    return Response.json({ error: 'Invalid template' }, { status: 400 });
  }

  const { templateId } = await params;

  try {
    const stored = await updateTemplate(sessionToken, templateId, toRagdollTemplate(template));
    return Response.json({ template: fromRagdollTemplate(stored) });
  } catch (error) {
    return ragdollErrorResponse(error);
  }
}

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
