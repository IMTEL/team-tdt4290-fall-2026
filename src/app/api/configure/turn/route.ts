import type { NextRequest } from 'next/server';

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
 * and checks whether its reply finishes the configuration.
 */
export async function POST(req: NextRequest) {
  // The configurator is shared, but only logged-in counsellors may use it (it spends IDUN quota).
  if (!(await getSessionToken(req))) {
    return Response.json({ error: 'Not signed in' }, { status: 401 });
  }

  let messages: RagdollMessage[];
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
    const configuration = parseConfiguration(reply);
    return Response.json({ reply, configuration, done: configuration !== null });
  } catch (error) {
    return ragdollErrorResponse(error);
  }
}
