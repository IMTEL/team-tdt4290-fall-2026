import type { ChatMessage } from './types';

const GENERIC_ERROR = 'Noe gikk galt. Prøv igjen.';

/** An error whose `userMessage` is safe to show in the UI (Norwegian, no technical details). */
export class ChatError extends Error {
  constructor(
    readonly userMessage: string,
    options?: { cause?: unknown },
  ) {
    super(userMessage, options);
    this.name = 'ChatError';
  }
}

/**
 * Sends the conversation to our /api/chat route (which talks to RAGdoll) and returns the reply.
 * Throws ChatError on failure. If `signal` is aborted, the fetch's AbortError is rethrown as is.
 */
export async function sendToAgent(messages: ChatMessage[], signal?: AbortSignal): Promise<string> {
  let res: Response;
  try {
    res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // RAGdoll only needs role and content, not our UI ids.
      body: JSON.stringify({ messages: messages.map(({ role, content }) => ({ role, content })) }),
      signal,
    });
  } catch (cause) {
    if (signal?.aborted) throw cause;
    throw new ChatError('Fikk ikke kontakt med serveren. Sjekk nettverket og prøv igjen.', {
      cause,
    });
  }

  if (res.status === 504) {
    throw new ChatError('Assistenten brukte for lang tid på å svare. Prøv igjen.');
  }
  if (!res.ok) {
    throw new ChatError(GENERIC_ERROR);
  }

  const data = await res.json().catch(() => null);
  if (typeof data?.response !== 'string') {
    throw new ChatError(GENERIC_ERROR);
  }
  return data.response;
}
