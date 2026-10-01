import type { NextRequest } from 'next/server';

import { isConfiguration } from '@/domain/configuration';
import { getSessionToken } from '@/lib/session-tokens';
import { toRagdollAgent } from '@/server/agentMapper';
import { listAgents, RagdollError, saveAgent, type RagdollErrorKind } from '@/server/ragdoll';

const MAX_NAME_LENGTH = 100;

// What the browser gets for each RAGdoll failure. Never RAGdoll's own message.
const errorResponses: Record<RagdollErrorKind, { status: number; error: string }> = {
  config: { status: 500, error: 'Server configuration error' },
  timeout: { status: 504, error: 'Request to RAGdoll API timed out' },
  unreachable: { status: 502, error: 'Error from RAGdoll API' },
  'bad-response': { status: 502, error: 'Invalid response from RAGdoll API' },
  unauthorized: { status: 401, error: 'Not signed in' },
};

function errorResponse(error: unknown) {
  console.error('Error talking to RAGdoll:', error);
  // Anything that is not a RagdollError is a bug in our code, not a RAGdoll problem.
  const { status, error: message } =
    error instanceof RagdollError
      ? errorResponses[error.kind]
      : { status: 500, error: 'Internal server error' };
  return Response.json({ error: message }, { status });
}

/** Saves a new interviewer agent, owned by the logged-in counsellor. Returns its id. */
export async function POST(req: NextRequest) {
  const sessionToken = await getSessionToken(req);
  if (!sessionToken) {
    return Response.json({ error: 'Not signed in' }, { status: 401 });
  }

  let name: string;
  let configuration;
  try {
    const body = await req.json();
    name = typeof body?.name === 'string' ? body.name.trim() : '';
    configuration = body?.configuration;
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!name || name.length > MAX_NAME_LENGTH) {
    return Response.json({ error: 'Invalid name' }, { status: 400 });
  }
  if (!isConfiguration(configuration)) {
    return Response.json({ error: 'Invalid configuration' }, { status: 400 });
  }

  const idunKey = process.env.IDUN_API_KEY;
  if (!idunKey) {
    console.error('IDUN_API_KEY is not set');
    return Response.json({ error: errorResponses.config.error }, { status: 500 });
  }

  try {
    const id = await saveAgent(sessionToken, toRagdollAgent(name, configuration, idunKey));
    return Response.json({ id }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

/** Lists the logged-in counsellor's agents, without any keys. */
export async function GET(req: NextRequest) {
  const sessionToken = await getSessionToken(req);
  if (!sessionToken) {
    return Response.json({ error: 'Not signed in' }, { status: 401 });
  }

  try {
    return Response.json({ agents: await listAgents(sessionToken) });
  } catch (error) {
    return errorResponse(error);
  }
}
