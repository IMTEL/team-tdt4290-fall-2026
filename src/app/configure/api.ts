import { ChatError } from '@/components/chat/sendToAgent';
import type { ChatMessage } from '@/components/chat/types';
import type { InterviewerTemplate } from '@/data/interviewer-templates';
import type { AnswerSources } from '@/domain/agentTypes/types';
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

/** What the counsellor chose before the chat: a template and a job seeker profile, or neither. */
export type ConfigurationChoices = { templateId: string | null; profileId: string | null };

/**
 * Sends the conversation to the configurator through /api/configure/turn, with the ids of the
 * chosen template and profile (left out when not chosen). Throws ChatError on failure. If `signal`
 * is aborted, the fetch's AbortError is rethrown as is.
 */
export async function sendConfigurationTurn(
  { templateId, profileId }: ConfigurationChoices,
  messages: ChatMessage[],
  signal?: AbortSignal,
): Promise<TurnResult> {
  // The server only needs role and content, not our UI ids.
  const history = messages.map(({ role, content }) => ({ role, content }));
  const res = await postJson(
    '/api/configure/turn',
    {
      templateId: templateId ?? undefined,
      profileId: profileId ?? undefined,
      messages: history,
    },
    signal,
  );
  if (!res.ok) throw errorFor(res);

  const data = await res.json().catch(() => null);
  if (typeof data?.reply !== 'string') throw new ChatError(GENERIC_ERROR);
  return {
    reply: data.reply,
    configuration: isConfiguration(data.configuration) ? data.configuration : null,
  };
}

/**
 * Saves the finished configuration as a new agent owned by the logged-in counsellor, with the
 * template and profile the interviewer and job seeker came from.
 */
export async function saveConfiguredAgent(
  name: string,
  configuration: Configuration,
  sources: AnswerSources = {},
): Promise<string> {
  const res = await postJson('/api/agents', { name, configuration, sources });
  if (!res.ok) throw errorFor(res);

  const data = await res.json().catch(() => null);
  if (typeof data?.id !== 'string') throw new ChatError(GENERIC_ERROR);
  return data.id;
}

function isTemplate(value: unknown): value is InterviewerTemplate {
  if (typeof value !== 'object' || value === null) return false;
  const template = value as Record<string, unknown>;
  return (
    typeof template.id === 'string' &&
    typeof template.title === 'string' &&
    typeof template.description === 'string' &&
    typeof template.persona === 'string' &&
    Array.isArray(template.focus) &&
    template.focus.every((item) => typeof item === 'string')
  );
}

/**
 * The templates the counsellor has saved, newest first. Not the built-in ones.
 * Throws Error if they could not be loaded.
 */
export async function fetchSavedTemplates(signal?: AbortSignal): Promise<InterviewerTemplate[]> {
  const res = await fetch('/api/templates', { cache: 'no-store', signal });
  if (!res.ok) throw new Error(`Could not load templates: ${res.status}`);

  const data = await res.json().catch(() => null);
  if (!Array.isArray(data?.templates) || !data.templates.every(isTemplate)) {
    throw new Error('Invalid templates from the server');
  }
  return data.templates;
}
