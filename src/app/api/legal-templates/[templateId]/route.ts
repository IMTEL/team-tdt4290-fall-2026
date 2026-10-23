import type { NextRequest } from 'next/server';

import { getSessionToken } from '@/lib/session-tokens';
import { ragdollErrorResponse } from '@/server/errorResponse';
import {
  fromRagdollLegalTemplate,
  parseNewLegalTemplate,
  toRagdollLegalTemplate,
} from '@/server/legalTemplateMapper';
import { deleteTemplate, getTemplate, RagdollError, updateTemplate } from '@/server/ragdoll';

type Params = { params: Promise<{ templateId: string }> };

const notFound = () => Response.json({ error: 'Not found' }, { status: 404 });

/**
 * True if the id is one of the counsellor's legal templates. RAGdoll checks the owner; we check the
 * type, so these routes never change or delete an agent type's template.
 */
async function isLegalTemplate(sessionToken: string, templateId: string): Promise<boolean> {
  try {
    return fromRagdollLegalTemplate(await getTemplate(sessionToken, templateId)) !== null;
  } catch (error) {
    if (error instanceof RagdollError && error.kind === 'not-found') return false;
    throw error;
  }
}

/** One of the logged-in counsellor's legal templates. */
export async function GET(req: NextRequest, { params }: Params) {
  const sessionToken = await getSessionToken(req);
  if (!sessionToken) {
    return Response.json({ error: 'Not signed in' }, { status: 401 });
  }

  const { templateId } = await params;

  try {
    const template = fromRagdollLegalTemplate(await getTemplate(sessionToken, templateId));
    // A template of another type is not a legal template.
    if (!template) return notFound();
    return Response.json({ template });
  } catch (error) {
    return ragdollErrorResponse(error);
  }
}

/** Replaces one of the logged-in counsellor's legal templates and returns it. */
export async function PUT(req: NextRequest, { params }: Params) {
  const sessionToken = await getSessionToken(req);
  if (!sessionToken) {
    return Response.json({ error: 'Not signed in' }, { status: 401 });
  }

  let template;
  try {
    template = parseNewLegalTemplate(await req.json());
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!template) {
    return Response.json({ error: 'Invalid legal template' }, { status: 400 });
  }

  const { templateId } = await params;

  try {
    if (!(await isLegalTemplate(sessionToken, templateId))) return notFound();
    const stored = await updateTemplate(sessionToken, templateId, toRagdollLegalTemplate(template));
    return Response.json({ template: fromRagdollLegalTemplate(stored) });
  } catch (error) {
    return ragdollErrorResponse(error);
  }
}

/** Deletes one of the logged-in counsellor's legal templates. */
export async function DELETE(req: NextRequest, { params }: Params) {
  const sessionToken = await getSessionToken(req);
  if (!sessionToken) {
    return Response.json({ error: 'Not signed in' }, { status: 401 });
  }

  const { templateId } = await params;

  try {
    if (!(await isLegalTemplate(sessionToken, templateId))) return notFound();
    await deleteTemplate(sessionToken, templateId);
    return new Response(null, { status: 204 });
  } catch (error) {
    return ragdollErrorResponse(error);
  }
}
