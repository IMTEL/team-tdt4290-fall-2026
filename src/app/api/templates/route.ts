import type { NextRequest } from 'next/server';

import { getSessionToken } from '@/lib/session-tokens';
import { ragdollErrorResponse } from '@/server/errorResponse';
import { createTemplate, listTemplates } from '@/server/ragdoll';
import {
  fromRagdollTemplate,
  INTERVIEWER_TEMPLATE_TYPE,
  parseNewTemplate,
  toRagdollTemplate,
} from '@/server/templateMapper';

/** Lists the interviewer templates the logged-in counsellor has saved. Not the built-in ones. */
export async function GET(req: NextRequest) {
  const sessionToken = await getSessionToken(req);
  if (!sessionToken) {
    return Response.json({ error: 'Not signed in' }, { status: 401 });
  }

  try {
    const stored = await listTemplates(sessionToken, INTERVIEWER_TEMPLATE_TYPE);
    // Skip templates with content we can't read, instead of failing the whole list.
    const templates = stored.map(fromRagdollTemplate).filter((template) => template !== null);
    return Response.json({ templates });
  } catch (error) {
    return ragdollErrorResponse(error);
  }
}

/** Saves a new interviewer template, owned by the logged-in counsellor. Returns it with its id. */
export async function POST(req: NextRequest) {
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

  try {
    const stored = await createTemplate(sessionToken, toRagdollTemplate(template));
    return Response.json({ template: fromRagdollTemplate(stored) }, { status: 201 });
  } catch (error) {
    return ragdollErrorResponse(error);
  }
}
