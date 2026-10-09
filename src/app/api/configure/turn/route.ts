import type { NextRequest } from 'next/server';

import { findTemplate, type InterviewerTemplate } from '@/data/interviewer-templates';
import { parseConfiguration } from '@/domain/configuration';
import { getSessionToken } from '@/lib/session-tokens';
import { isRagdollMessage } from '@/server/chatMessages';
import { configErrorResponse, ragdollErrorResponse } from '@/server/errorResponse';
import { askAgent, getTemplate, RagdollError, type RagdollMessage } from '@/server/ragdoll';
import { fromRagdollTemplate } from '@/server/templateMapper';

/**
 * One turn of the configuration chat. Sends the conversation to the shared configurator agent
 * and checks whether its reply finishes the configuration. If the counsellor chose a template, it
 * decides the interviewer, so the configurator doesn't ask about it.
 */
export async function POST(req: NextRequest) {
  // The configurator is shared, but only logged-in counsellors may use it (it spends IDUN quota).
  const sessionToken = await getSessionToken(req);
  if (!sessionToken) {
    return Response.json({ error: 'Not signed in' }, { status: 401 });
  }

  let messages: RagdollMessage[];
  let templateId: string | undefined;
  try {
    const body = await req.json();
    if (
      !Array.isArray(body?.messages) ||
      body.messages.length === 0 ||
      !body.messages.every(isRagdollMessage)
    ) {
      return Response.json({ error: 'Invalid messages in request body' }, { status: 400 });
    }
    messages = body.messages;
    // No templateId means the counsellor started without a template.
    if (body.templateId !== undefined) {
      if (typeof body.templateId !== 'string' || !body.templateId) {
        return Response.json({ error: 'Unknown template' }, { status: 400 });
      }
      templateId = body.templateId;
    }
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  let template: InterviewerTemplate | undefined;
  if (templateId) {
    try {
      template = await findAnyTemplate(sessionToken, templateId);
    } catch (error) {
      return ragdollErrorResponse(error);
    }
    if (!template) {
      return Response.json({ error: 'Unknown template' }, { status: 400 });
    }
  }

  const id = process.env.RAGDOLL_CONFIGURATOR_AGENT_ID;
  const accessKey = process.env.RAGDOLL_CONFIGURATOR_ACCESS_KEY;
  if (!id || !accessKey) {
    console.error('The configurator agent is not set in the environment variables');
    return configErrorResponse();
  }

  try {
    const reply = await askAgent({ id, accessKey }, messages);
    const configuration = parseConfiguration(reply, template?.persona);
    return Response.json({ reply, configuration, done: configuration !== null });
  } catch (error) {
    return ragdollErrorResponse(error);
  }
}

/** A built-in template, or one the counsellor has saved in RAGdoll. Undefined if neither. */
async function findAnyTemplate(
  sessionToken: string,
  templateId: string,
): Promise<InterviewerTemplate | undefined> {
  const builtIn = findTemplate(templateId);
  if (builtIn) return builtIn;

  try {
    return fromRagdollTemplate(await getTemplate(sessionToken, templateId)) ?? undefined;
  } catch (error) {
    if (error instanceof RagdollError && error.kind === 'not-found') return undefined;
    throw error;
  }
}
