import type { NextRequest } from 'next/server';

import {
  formatTranscript,
  hasEnoughToJudge,
  keepGroundedPoints,
  MAX_TRANSCRIPT_LENGTH,
  parseObserverReply,
  TOO_SHORT_REASON,
  type ObserverFeedback,
} from '@/domain/observerFeedback';
import { getSessionToken } from '@/lib/session-tokens';
import { isRagdollMessage } from '@/server/chatMessages';
import { configErrorResponse, ragdollErrorResponse } from '@/server/errorResponse';
import { askAgent, RagdollError, type RagdollMessage } from '@/server/ragdoll';
import { chatRetryAfter, tooManyRequestsResponse } from '@/server/rateLimit';

// How much of a reply that is not feedback goes into the log. It may quote the candidate.
const LOGGED_REPLY_LENGTH = 200;

/**
 * Feedback on a test chat from the shared observer agent. It reads the whole conversation and
 * points to what the candidate said that went well or can be better. Points that quote words the
 * candidate never said are dropped. A conversation that is too short gets no LLM call.
 */
export async function POST(req: NextRequest) {
  // The observer reads nothing of the counsellor's agents, but it spends IDUN quota.
  const sessionToken = await getSessionToken(req);
  if (!sessionToken) {
    return Response.json({ error: 'Not signed in' }, { status: 401 });
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

  if (!hasEnoughToJudge(messages)) {
    const feedback: ObserverFeedback = { kind: 'too-short', reason: TOO_SHORT_REASON };
    return Response.json({ feedback });
  }
  // The whole chat goes to the LLM as one message, so its length is what has to be limited.
  const transcript = formatTranscript(messages);
  if (transcript.length > MAX_TRANSCRIPT_LENGTH) {
    return Response.json({ error: 'Chat too long' }, { status: 413 });
  }

  // Counted only now: the answers above cost no LLM call.
  const retryAfter = chatRetryAfter(sessionToken);
  if (retryAfter > 0) {
    return tooManyRequestsResponse(retryAfter);
  }

  const id = process.env.RAGDOLL_OBSERVER_AGENT_ID;
  const accessKey = process.env.RAGDOLL_OBSERVER_ACCESS_KEY;
  if (!id || !accessKey) {
    console.error('The observer agent is not set in the environment variables');
    return configErrorResponse();
  }

  try {
    const reply = await askAgent({ id, accessKey }, [{ role: 'user', content: transcript }]);
    const parsed = parseObserverReply(reply);
    if (!parsed) {
      // An empty reply usually means the model spent its llm_max_tokens on reasoning.
      const start = reply.trim() ? reply.slice(0, LOGGED_REPLY_LENGTH) : '(empty reply)';
      throw new RagdollError('bad-response', `The observer's reply is not feedback: ${start}`);
    }
    const feedback = keepGroundedPoints(parsed, messages);
    // Nothing left to show: every quote was invented, or the observer gave no points at all.
    if (feedback.kind === 'feedback' && !feedback.wentWell.length && !feedback.toImprove.length) {
      throw new RagdollError('bad-response', `No point in the observer's reply quotes the chat`);
    }
    return Response.json({ feedback });
  } catch (error) {
    return ragdollErrorResponse(error);
  }
}
