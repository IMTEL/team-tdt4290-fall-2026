import {
  FEEDBACK_LIMITS as LIMITS,
  isRating,
  type MessageFeedback,
  type NewMessageFeedback,
} from '@/domain/messageFeedback';
import type { NewRagdollFeedback, RagdollFeedback } from './ragdoll';

/** The text without spaces at the ends, or null if it is not text or is too long. */
function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text.length <= max ? text : null;
}

/**
 * The rating from a request body, with spaces trimmed. Null if the rating or the reply is missing
 * or a text is too long. Only these fields are kept: the agent comes from the URL and the author
 * from the session, never from the browser.
 */
export function parseNewFeedback(body: unknown): NewMessageFeedback | null {
  if (typeof body !== 'object' || body === null) return null;
  const b = body as Record<string, unknown>;

  const agentMessage = cleanText(b.agentMessage, LIMITS.agentMessage);
  const userMessage = cleanText(b.userMessage ?? '', LIMITS.userMessage);
  const comment = cleanText(b.comment ?? '', LIMITS.comment);

  if (!isRating(b.rating) || !agentMessage || userMessage === null || comment === null) {
    return null;
  }
  return { rating: b.rating, agentMessage, userMessage, comment };
}

/** The body RAGdoll's POST /agents/{id}/feedback takes. */
export function toRagdollFeedback(feedback: NewMessageFeedback): NewRagdollFeedback {
  return {
    rating: feedback.rating,
    agent_message: feedback.agentMessage,
    user_message: feedback.userMessage,
    comment: feedback.comment,
  };
}

/** What the browser gets. The agent id is already in the URL. */
export function fromRagdollFeedback(feedback: RagdollFeedback): MessageFeedback {
  return {
    id: feedback.id,
    rating: feedback.rating,
    agentMessage: feedback.agent_message,
    userMessage: feedback.user_message,
    comment: feedback.comment,
    createdAt: feedback.created_at,
  };
}
