import type { NextRequest } from 'next/server';

import { getTemplateAgentType, listTemplateAgentTypes } from '@/domain/agentTypes/registry';
import { getSessionToken } from '@/lib/session-tokens';
import { ragdollErrorResponse } from '@/server/errorResponse';
import { createTemplate, listTemplates } from '@/server/ragdoll';
import { fromRagdollTemplate, parseNewTemplate, toRagdollTemplate } from '@/server/templateMapper';

/**
 * Lists the templates the logged-in counsellor has saved, for one agent type with
 * `?agentType=<id>`, or for every type templates can be made for. Not the built-in ones.
 */
export async function GET(req: NextRequest) {
  const sessionToken = await getSessionToken(req);
  if (!sessionToken) {
    return Response.json({ error: 'Not signed in' }, { status: 401 });
  }

  const agentType = req.nextUrl.searchParams.get('agentType');
  const definitions = agentType ? [getTemplateAgentType(agentType)] : listTemplateAgentTypes();
  if (definitions.some((definition) => !definition)) {
    return Response.json({ error: 'Unknown agent type' }, { status: 400 });
  }

  try {
    // RAGdoll lists one type at a time, and an agent type's id is its templates' type.
    const lists = await Promise.all(
      definitions.map((definition) => listTemplates(sessionToken, definition!.id)),
    );
    const stored = lists.flat();
    // Skip templates with content we can't read, instead of failing the whole list.
    const templates = stored.map(fromRagdollTemplate).filter((template) => template !== null);
    return Response.json({ templates });
  } catch (error) {
    return ragdollErrorResponse(error);
  }
}

/** Saves a new template for an agent type, owned by the logged-in counsellor. Returns it with its id. */
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
