import type { NextRequest } from 'next/server';

import { cleanName } from '@/domain/agentName';
import { hasAllAnswers } from '@/domain/agentTypes/registry';
import { readStoredAnswers } from '@/domain/agentTypes/storedAnswers';
import { getSessionToken } from '@/lib/session-tokens';
import { toRagdollAgent } from '@/server/agentMapper';
import { configErrorResponse, ragdollErrorResponse } from '@/server/errorResponse';
import { fetchFullAgent, saveAgent } from '@/server/ragdoll';

type Params = { params: Promise<{ agentId: string }> };

/**
 * Saves a new agent made from one of the logged-in counsellor's agents, with the name and answers
 * from the clone form. The original agent is only read, never changed. Returns the new agent's id.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const sessionToken = await getSessionToken(req);
  if (!sessionToken) {
    return Response.json({ error: 'Not signed in' }, { status: 401 });
  }

  let name: string | null;
  let answers: unknown;
  try {
    const body = await req.json();
    name = cleanName(body?.name);
    answers = body?.answers;
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!name) {
    return Response.json({ error: 'Invalid name' }, { status: 400 });
  }

  const idunKey = process.env.IDUN_API_KEY;
  if (!idunKey) {
    console.error('IDUN_API_KEY is not set');
    return configErrorResponse();
  }

  const { agentId } = await params;

  try {
    const original = await fetchFullAgent(sessionToken, agentId);

    // The agent type comes from the original, never from the browser.
    const stored = readStoredAnswers(original.description);
    if (!stored) {
      return Response.json({ error: 'Agent has no configuration to clone' }, { status: 400 });
    }
    if (!hasAllAnswers(stored.definition, answers)) {
      return Response.json({ error: 'Invalid answers' }, { status: 400 });
    }

    const clone = toRagdollAgent(name, stored.definition, answers, idunKey);
    const id = await saveAgent(sessionToken, clone);
    return Response.json({ id }, { status: 201 });
  } catch (error) {
    return ragdollErrorResponse(error);
  }
}
