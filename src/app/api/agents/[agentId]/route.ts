import type { NextRequest } from 'next/server';

import { cleanName } from '@/domain/agentName';
import { hasAllAnswers } from '@/domain/agentTypes/registry';
import { readStoredAnswers } from '@/domain/agentTypes/storedAnswers';
import { getSessionToken } from '@/lib/session-tokens';
import { applyEdit } from '@/server/agentMapper';
import { ragdollErrorResponse } from '@/server/errorResponse';
import { deleteAgent, fetchFullAgent, isAgentOwner, updateAgent } from '@/server/ragdoll';

type Params = { params: Promise<{ agentId: string }> };

/**
 * Saves a new name and new answers for one of the logged-in counsellor's agents.
 * The prompt is rebuilt from the answers, and every other field of the agent is kept.
 */
export async function PUT(req: NextRequest, { params }: Params) {
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

  const { agentId } = await params;

  try {
    const existing = await fetchFullAgent(sessionToken, agentId);

    // The agent type comes from what is stored, never from the browser.
    const stored = readStoredAnswers(existing.description);
    if (!stored) {
      return Response.json({ error: 'Agent has no configuration to edit' }, { status: 400 });
    }
    if (!hasAllAnswers(stored.definition, answers)) {
      return Response.json({ error: 'Invalid answers' }, { status: 400 });
    }

    const edited = applyEdit(existing, name, stored.definition, answers);
    return Response.json({ agent: await updateAgent(sessionToken, edited) });
  } catch (error) {
    return ragdollErrorResponse(error);
  }
}

/** Deletes one of the logged-in user's agents.*/
export async function DELETE(req: NextRequest, { params }: Params) {
  const sessionToken = await getSessionToken(req);
  if (!sessionToken) {
    return Response.json({ error: 'Not signed in' }, { status: 401 });
  }

  const { agentId } = await params;

  try {
    await fetchFullAgent(sessionToken, agentId);

    if (!(await isAgentOwner(sessionToken, agentId))) {
      return Response.json({ error: 'Only the owner can delete the agent' }, { status: 403 });
    }

    await deleteAgent(sessionToken, agentId);
    return new Response(null, { status: 204 });
  } catch (error) {
    return ragdollErrorResponse(error);
  }
}
