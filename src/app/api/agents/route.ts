import type { NextRequest } from 'next/server';

import { isConfiguration } from '@/domain/configuration';
import { getSessionToken } from '@/lib/session-tokens';
import { toRagdollAgent } from '@/server/agentMapper';
import { configErrorResponse, ragdollErrorResponse } from '@/server/errorResponse';
import { listAgents, saveAgent } from '@/server/ragdoll';

const MAX_NAME_LENGTH = 100;

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
    return configErrorResponse();
  }

  try {
    const id = await saveAgent(sessionToken, toRagdollAgent(name, configuration, idunKey));
    return Response.json({ id }, { status: 201 });
  } catch (error) {
    return ragdollErrorResponse(error);
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
    return ragdollErrorResponse(error);
  }
}
