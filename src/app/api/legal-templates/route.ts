import type { NextRequest } from 'next/server';

import { LEGAL_TEMPLATE_TYPE } from '@/domain/legalTemplate';
import { getSessionToken } from '@/lib/session-tokens';
import { ragdollErrorResponse } from '@/server/errorResponse';
import {
  fromRagdollLegalTemplate,
  parseNewLegalTemplate,
  toRagdollLegalTemplate,
} from '@/server/legalTemplateMapper';
import { createTemplate, listTemplates } from '@/server/ragdoll';

/** Lists the logged-in counsellor's own legal templates, newest first. Not the built-in ones. */
export async function GET(req: NextRequest) {
  const sessionToken = await getSessionToken(req);
  if (!sessionToken) {
    return Response.json({ error: 'Not signed in' }, { status: 401 });
  }

  try {
    const stored = await listTemplates(sessionToken, LEGAL_TEMPLATE_TYPE);
    // One we can't read is left out, so it doesn't hide the others.
    const templates = stored.map(fromRagdollLegalTemplate).filter((template) => template !== null);
    return Response.json({ templates });
  } catch (error) {
    return ragdollErrorResponse(error);
  }
}

/** Saves a new legal template, owned by the logged-in counsellor. Returns it with its id. */
export async function POST(req: NextRequest) {
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

  try {
    const stored = await createTemplate(sessionToken, toRagdollLegalTemplate(template));
    return Response.json({ template: fromRagdollLegalTemplate(stored) }, { status: 201 });
  } catch (error) {
    return ragdollErrorResponse(error);
  }
}
