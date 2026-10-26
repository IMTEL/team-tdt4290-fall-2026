import type { ChatMessage } from './types';

const GENERIC_ERROR = 'Noe gikk galt. Prøv igjen.';

/** Shown when the server refuses a message because too many were sent in a short time. */
export const TOO_MANY_MESSAGES =
  'Du har sendt mange meldinger på kort tid. Vent litt og prøv igjen.';

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
 * Sends the conversation to one of the counsellor's saved agents through our server (which talks
 * to RAGdoll) and returns the reply. Throws ChatError on failure. If `signal` is aborted, the
 * fetch's AbortError is rethrown as is.
 */
export async function sendToAgent(
  agentId: string,
  messages: ChatMessage[],
  signal?: AbortSignal,
): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`/api/agents/${encodeURIComponent(agentId)}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // RAGdoll only needs role and content, not our UI ids.
      body: JSON.stringify({
        messages: messages.map(({ role, content }) => ({ role, content })),
      }),
      signal,
    });
  } catch (cause) {
    if (signal?.aborted) throw cause;
    throw new ChatError('Fikk ikke kontakt med serveren. Sjekk nettverket og prøv igjen.', {
      cause,
    });
  }

  if (res.status === 404) {
    throw new ChatError('Fant ikke intervjueren. Den kan være slettet.');
  }
  if (res.status === 504) {
    throw new ChatError('Assistenten brukte for lang tid på å svare. Prøv igjen.');
  }
  if (res.status === 429) {
    throw new ChatError(TOO_MANY_MESSAGES);
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
