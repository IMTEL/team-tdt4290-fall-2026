import type { NextRequest } from 'next/server';

import { getSessionToken } from '@/lib/session-tokens';
import { ragdollErrorResponse } from '@/server/errorResponse';
import { syncAgentPromptWithFeedback } from '@/server/feedbackPrompt';
import { deleteFeedback } from '@/server/ragdoll';

type Params = { params: Promise<{ agentId: string; feedbackId: string }> };

// A MongoDB id is 24 hex characters; RAGdoll gives each rating a UUID. Anything else can't be one
// of them, so don't ask RAGdoll.
const AGENT_ID = /^[a-f0-9]{24}$/;
const FEEDBACK_ID = /^[a-zA-Z0-9-]{1,64}$/;

/**
 * Deletes one of the agent's ratings, e.g. to undo it. RAGdoll checks that the counsellor owns or
 * collaborates on the agent, and that the rating belongs to it.
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  const sessionToken = await getSessionToken(req);
  if (!sessionToken) {
    return Response.json({ error: 'Not signed in' }, { status: 401 });
  }

  const { agentId, feedbackId } = await params;
  if (!AGENT_ID.test(agentId) || !FEEDBACK_ID.test(feedbackId)) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    await deleteFeedback(sessionToken, agentId, feedbackId);
    await syncAgentPromptWithFeedback(sessionToken, agentId).catch((error) => {
      console.error('Could not take the rating out of the interviewer prompt:', error);
    });
    return new Response(null, { status: 204 });
  } catch (error) {
    return ragdollErrorResponse(error);
  }
}
