import { TOO_MANY_MESSAGES } from '@/components/chat/sendToAgent';
import type { ChatMessage } from '@/components/chat/types';
import {
  FEEDBACK_LIMITS,
  isRating,
  type MessageFeedback,
  type NewMessageFeedback,
} from '@/domain/messageFeedback';
import { isObserverFeedback, type ObserverFeedback } from '@/domain/observerFeedback';

const NETWORK_ERROR = 'Fikk ikke kontakt med serveren. Sjekk nettverket og prøv igjen.';

/** The Norwegian message for a failed request. Never the server's own text. */
function errorMessage(status: number, fallback: string): string {
  if (status === 401) return 'Du er logget ut. Logg inn på nytt og prøv igjen.';
  if (status === 404) return 'Fant ikke intervjueren. Den kan være slettet.';
  return fallback;
}

/**
 * Cuts text to at most `max` UTF-16 units without splitting an emoji or other character that
 * needs two units. A half character would make RAGdoll fail to store the text.
 */
function cut(text: string, max: number): string {
  const short = text.slice(0, max);
  return /[\uD800-\uDBFF]$/.test(short) ? short.slice(0, -1) : short;
}

function isFeedback(value: unknown): value is MessageFeedback {
  if (typeof value !== 'object' || value === null) return false;
  const f = value as Record<string, unknown>;
  return (
    typeof f.id === 'string' &&
    isRating(f.rating) &&
    typeof f.agentMessage === 'string' &&
    typeof f.userMessage === 'string' &&
    typeof f.comment === 'string' &&
    typeof f.createdAt === 'string'
  );
}

/**
 * Rates one of the agent's replies and returns the stored rating with its id. A very long reply
 * or user message is cut to what RAGdoll stores. Throws Error with a Norwegian message.
 */
export async function rateReply(
  agentId: string,
  feedback: NewMessageFeedback,
): Promise<MessageFeedback> {
  const fallback = 'Kunne ikke lagre vurderingen. Prøv igjen.';
  let res: Response;
  try {
    res = await fetch(`/api/agents/${encodeURIComponent(agentId)}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rating: feedback.rating,
        agentMessage: cut(feedback.agentMessage.trim(), FEEDBACK_LIMITS.agentMessage),
        userMessage: cut(feedback.userMessage.trim(), FEEDBACK_LIMITS.userMessage),
        comment: feedback.comment.trim(),
      }),
    });
  } catch (cause) {
    throw new Error(NETWORK_ERROR, { cause });
  }
  if (!res.ok) throw new Error(errorMessage(res.status, fallback));

  const data = await res.json().catch(() => null);
  if (!isFeedback(data?.feedback)) throw new Error(fallback);
  return data.feedback;
}

/**
 * Deletes a rating, to undo it. Throws Error with a Norwegian message.
 *
 * A 404 is an error too: RAGdoll also answers 404 when the user has lost access to the agent, and
 * then the rating is still in the agent's prompt.
 */
export async function undoRating(agentId: string, feedbackId: string): Promise<void> {
  const path = `/api/agents/${encodeURIComponent(agentId)}/feedback/${encodeURIComponent(feedbackId)}`;
  let res: Response;
  try {
    res = await fetch(path, { method: 'DELETE' });
  } catch (cause) {
    throw new Error(NETWORK_ERROR, { cause });
  }
  if (res.ok) return;
  throw new Error(errorMessage(res.status, 'Kunne ikke angre vurderingen. Prøv igjen.'));
}

/**
 * Asks the observer for feedback on the test chat so far. The server checks the quotes and says
 * when the chat is too short. Throws Error with a Norwegian message. If `signal` is aborted, the
 * fetch's AbortError is rethrown as is.
 */
export async function requestObserverFeedback(
  messages: ChatMessage[],
  signal?: AbortSignal,
): Promise<ObserverFeedback> {
  const fallback = 'Kunne ikke lage en tilbakemelding. Prøv igjen.';
  let res: Response;
  try {
    res = await fetch('/api/test-chat/observer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // The observer only needs role and content, not our UI ids.
      body: JSON.stringify({ messages: messages.map(({ role, content }) => ({ role, content })) }),
      signal,
    });
  } catch (cause) {
    if (signal?.aborted) throw cause;
    throw new Error(NETWORK_ERROR, { cause });
  }
  if (res.status === 401) throw new Error(errorMessage(401, fallback));
  if (res.status === 429) throw new Error(TOO_MANY_MESSAGES);
  if (res.status === 413) {
    throw new Error('Samtalen er for lang til å gi tilbakemelding. Start på nytt med en kortere.');
  }
  if (res.status === 504) {
    throw new Error('Tilbakemeldingen tok for lang tid å lage. Prøv igjen.');
  }
  if (!res.ok) throw new Error(fallback);

  const data = await res.json().catch(() => null);
  if (!isObserverFeedback(data?.feedback)) throw new Error(fallback);
  return data.feedback;
}
