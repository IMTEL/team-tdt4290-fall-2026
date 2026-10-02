import { ChatError } from '@/components/chat/sendToAgent';
import type { ChatMessage } from '@/components/chat/types';
import { isConfiguration, type Configuration } from '@/domain/configuration';

const GENERIC_ERROR = 'Noe gikk galt. Prøv igjen.';

export type TurnResult = {
  reply: string;
  /** Set only when this reply finished the configuration. */
  configuration: Configuration | null;
};

async function postJson(url: string, body: unknown, signal?: AbortSignal): Promise<Response> {
  try {
    return await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
  } catch (cause) {
    if (signal?.aborted) throw cause;
    throw new ChatError('Fikk ikke kontakt med serveren. Sjekk nettverket og prøv igjen.', {
      cause,
    });
  }
}

/** The message to show for a failed response. Never the server's own text. */
function errorFor(res: Response): ChatError {
  if (res.status === 401) {
    return new ChatError('Du er logget ut. Logg inn på nytt for å fortsette.');
  }
  if (res.status === 504) {
    return new ChatError('Det tok for lang tid å få svar. Prøv igjen.');
  }
  return new ChatError(GENERIC_ERROR);
}

/**
 * Sends the conversation to the configurator through /api/configure/turn. Throws ChatError on
 * failure. If `signal` is aborted, the fetch's AbortError is rethrown as is.
 */
export async function sendConfigurationTurn(
  messages: ChatMessage[],
  signal?: AbortSignal,
): Promise<TurnResult> {
  // The server only needs role and content, not our UI ids.
  const history = messages.map(({ role, content }) => ({ role, content }));
  const res = await postJson('/api/configure/turn', { messages: history }, signal);
  if (!res.ok) throw errorFor(res);

  const data = await res.json().catch(() => null);
  if (typeof data?.reply !== 'string') throw new ChatError(GENERIC_ERROR);
  return {
    reply: data.reply,
    configuration: isConfiguration(data.configuration) ? data.configuration : null,
  };
}

/** Saves the finished configuration as a new agent owned by the logged-in counsellor. */
export async function saveConfiguredAgent(
  name: string,
  configuration: Configuration,
): Promise<string> {
  const res = await postJson('/api/agents', { name, configuration });
  if (!res.ok) throw errorFor(res);

  const data = await res.json().catch(() => null);
  if (typeof data?.id !== 'string') throw new ChatError(GENERIC_ERROR);
  return data.id;
}
