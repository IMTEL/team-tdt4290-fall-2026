import type { NextRequest } from 'next/server';

import { getSessionToken } from '@/lib/session-tokens';
import { ragdollErrorResponse } from '@/server/errorResponse';
import { fromRagdollFeedback, parseNewFeedback, toRagdollFeedback } from '@/server/feedbackMapper';
import { syncAgentPromptWithFeedback } from '@/server/feedbackPrompt';
import { createFeedback, listFeedback } from '@/server/ragdoll';

type Params = { params: Promise<{ agentId: string }> };

// A MongoDB id is 24 hex characters. Anything else cannot be an agent, so don't ask RAGdoll.
const AGENT_ID = /^[a-f0-9]{24}$/;

/**
 * The ratings of one of the counsellor's agents, newest first. `?limit=` takes 1 to 200 (50 if
 * left out). RAGdoll checks that the counsellor owns or collaborates on the agent.
 */
export async function GET(req: NextRequest, { params }: Params) {
  const sessionToken = await getSessionToken(req);
  if (!sessionToken) {
    return Response.json({ error: 'Not signed in' }, { status: 401 });
  }

  const { agentId } = await params;
  if (!AGENT_ID.test(agentId)) {
    return Response.json({ error: 'Agent not found' }, { status: 404 });
  }

  const limitParam = req.nextUrl.searchParams.get('limit');
  const limit = limitParam === null ? 50 : Number(limitParam);
  if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
    return Response.json({ error: 'Invalid limit' }, { status: 400 });
  }

  try {
    const feedback = (await listFeedback(sessionToken, agentId, limit)).map(fromRagdollFeedback);
    return Response.json({ feedback });
  } catch (error) {
    return ragdollErrorResponse(error);
  }
}

/** Rates one of the agent's replies. The agent comes from the URL and the author from the session. */
export async function POST(req: NextRequest, { params }: Params) {
  const sessionToken = await getSessionToken(req);
  if (!sessionToken) {
    return Response.json({ error: 'Not signed in' }, { status: 401 });
  }

  const { agentId } = await params;
  if (!AGENT_ID.test(agentId)) {
    return Response.json({ error: 'Agent not found' }, { status: 404 });
  }

  let feedback;
  try {
    feedback = parseNewFeedback(await req.json());
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!feedback) {
    return Response.json({ error: 'Invalid feedback' }, { status: 400 });
  }

  try {
    const stored = await createFeedback(sessionToken, agentId, toRagdollFeedback(feedback));
    // Best effort: the rating is stored even if rewriting the prompt fails. The next rating or
    // edit writes the whole list in.
    await syncAgentPromptWithFeedback(sessionToken, agentId).catch((error) => {
      console.error('Could not write the rating into the interviewer prompt:', error);
    });
    return Response.json({ feedback: fromRagdollFeedback(stored) }, { status: 201 });
  } catch (error) {
    return ragdollErrorResponse(error);
  }
}
