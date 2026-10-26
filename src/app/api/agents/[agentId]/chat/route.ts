import type { NextRequest } from 'next/server';

import { getSessionToken } from '@/lib/session-tokens';
import { isRagdollMessage } from '@/server/chatMessages';
import { ragdollErrorResponse } from '@/server/errorResponse';
import {
  askSavedAgent,
  getAgentRole,
  getChatAccessKey,
  RagdollError,
  type RagdollMessage,
} from '@/server/ragdoll';
import { chatRetryAfter, tooManyRequestsResponse } from '@/server/rateLimit';

type Params = { params: Promise<{ agentId: string }> };

/** One turn of the test chat with one of the logged-in counsellor's saved agents. */
export async function POST(req: NextRequest, { params }: Params) {
  const sessionToken = await getSessionToken(req);
  if (!sessionToken) {
    return Response.json({ error: 'Not signed in' }, { status: 401 });
  }
  const retryAfter = chatRetryAfter(sessionToken);
  if (retryAfter > 0) {
    return tooManyRequestsResponse(retryAfter);
  }

  // A MongoDB id is 24 hex characters. Anything else cannot be an agent, so don't ask RAGdoll.
  const { agentId } = await params;
  if (!/^[a-f0-9]{24}$/.test(agentId)) {
    return Response.json({ error: 'Agent not found' }, { status: 404 });
  }

  let messages: RagdollMessage[];
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
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  try {
    const [accessKey, roleName] = await Promise.all([
      getChatAccessKey(sessionToken, agentId),
      getAgentRole(sessionToken, agentId),
    ]);
    const reply = await askSavedAgent(
      { id: agentId, accessKey, roleName: roleName ?? undefined },
      messages,
    );
    return Response.json({ response: reply });
  } catch (error) {
    // RAGdoll answers 401 both for a bad session and for someone else's agent. The session was
    // valid a moment ago, so here it means the agent is not theirs.
    if (error instanceof RagdollError && error.kind === 'unauthorized') {
      console.error('No access to the agent in RAGdoll:', error);
      return Response.json({ error: 'Agent not found' }, { status: 404 });
    }
    return ragdollErrorResponse(error);
  }
}
