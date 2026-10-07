import type { NextRequest } from 'next/server';

import { findTemplate, type InterviewerTemplate } from '@/data/interviewer-templates';
import { parseConfiguration } from '@/domain/configuration';
import { getSessionToken } from '@/lib/session-tokens';
import { configErrorResponse, ragdollErrorResponse } from '@/server/errorResponse';
import { askAgent, type RagdollMessage } from '@/server/ragdoll';

function isMessage(value: unknown): value is RagdollMessage {
  if (typeof value !== 'object' || value === null) return false;
  const { role, content } = value as Record<string, unknown>;
  return (role === 'user' || role === 'assistant') && typeof content === 'string';
}

/**
 * One turn of the configuration chat. Sends the conversation to the shared configurator agent
 * and checks whether its reply finishes the configuration. If the counsellor chose a template, it
 * decides the interviewer, so the configurator doesn't ask about it.
 */
export async function POST(req: NextRequest) {
  // The configurator is shared, but only logged-in counsellors may use it (it spends IDUN quota).
  if (!(await getSessionToken(req))) {
    return Response.json({ error: 'Not signed in' }, { status: 401 });
  }

  let messages: RagdollMessage[];
  let template: InterviewerTemplate | undefined;
  try {
    const body = await req.json();
    if (
      !Array.isArray(body?.messages) ||
      body.messages.length === 0 ||
      !body.messages.every(isMessage)
    ) {
      return Response.json({ error: 'Invalid messages in request body' }, { status: 400 });
    }
    messages = body.messages;
    // No templateId means the counsellor started without a template.
    if (body.templateId !== undefined) {
      template = typeof body.templateId === 'string' ? findTemplate(body.templateId) : undefined;
      if (!template) {
        return Response.json({ error: 'Unknown template' }, { status: 400 });
      }
    }
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
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
