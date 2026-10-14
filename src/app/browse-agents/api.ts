import type { Agent } from '@/lib/types';
import type { AnswerSources, Answers } from '@/domain/agentTypes/types';

const GENERIC_ERROR = 'Noe gikk galt. Prøv igjen.';

// Only the list sends these, so an agent may come without them. The update answer does not.
const LIST_FIELDS = ['type', 'typeLabel', 'stilling', 'bransje', 'vanskelighetsgrad'] as const;

function isAgent(value: unknown): value is Agent {
  if (typeof value !== 'object' || value === null) return false;
  const agent = value as Record<string, unknown>;
  return (
    typeof agent.id === 'string' &&
    typeof agent.name === 'string' &&
    typeof agent.description === 'string' &&
    typeof agent.lastUpdated === 'string' &&
    LIST_FIELDS.every((field) => isOptionalText(agent[field]))
  );
}

/** True for text, null, or a missing field. */
function isOptionalText(value: unknown): boolean {
  return value === undefined || value === null || typeof value === 'string';
}

/**
 * Loads the signed-in counsellor's agents. The cookie goes with the request, and `no-store`
 * means an agent saved a moment ago is in the list. Throws Error with a Norwegian message.
 */
export async function fetchAgents(): Promise<Agent[]> {
  let res: Response;
  try {
    res = await fetch('/api/agents', { cache: 'no-store' });
  } catch (cause) {
    throw new Error(GENERIC_ERROR, { cause });
  }
  if (!res.ok) throw new Error(GENERIC_ERROR);

  const data = await res.json().catch(() => null);
  if (!data || !Array.isArray(data.agents) || !data.agents.every(isAgent)) {
    throw new Error(GENERIC_ERROR);
  }
  return data.agents;
}

/** The Norwegian message for a failed save. Never the server's own text. */
function saveErrorMessage(status: number): string {
  if (status === 401) return 'Du er logget ut. Logg inn på nytt og prøv igjen.';
  if (status === 404) return 'Fant ikke agenten. Den kan ha blitt slettet.';
  if (status === 504) return 'Det tok for lang tid å få svar. Prøv igjen.';
  if (status === 403) return 'Bare eieren kan slette agenten.';
  return GENERIC_ERROR;
}

/**
 * Saves a new name, new answers and their sources for an agent, and returns the updated agent.
 * Throws Error with a Norwegian message that can be shown as it is.
 */
export async function updateAgent(
  id: string,
  name: string,
  answers: Answers,
  sources: AnswerSources = {},
): Promise<Agent> {
  let res: Response;
  try {
    res = await fetch(`/api/agents/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, answers, sources }),
    });
  } catch (cause) {
    throw new Error('Fikk ikke kontakt med serveren. Sjekk nettverket og prøv igjen.', { cause });
  }
  if (!res.ok) throw new Error(saveErrorMessage(res.status));

  const data = await res.json().catch(() => null);
  if (!isAgent(data?.agent)) throw new Error(GENERIC_ERROR);
  return data.agent;
}

/**
 * Saves a new agent made from another agent, with the name and answers from the clone form, and
 * returns the new agent's id. The original is not changed.
 * Throws Error with a Norwegian message that can be shown as it is.
 */
export async function cloneAgent(
  id: string,
  name: string,
  answers: Answers,
  sources: AnswerSources = {},
): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`/api/agents/${encodeURIComponent(id)}/clone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, answers, sources }),
    });
  } catch (cause) {
    throw new Error('Fikk ikke kontakt med serveren. Sjekk nettverket og prøv igjen.', { cause });
  }
  if (!res.ok) throw new Error(saveErrorMessage(res.status));

  const data = await res.json().catch(() => null);
  if (typeof data?.id !== 'string') throw new Error(GENERIC_ERROR);
  return data.id;
}

/** Deletes an agent */
export async function deleteAgent(id: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`/api/agents/${encodeURIComponent(id)}`, { method: 'DELETE' });
  } catch (cause) {
    throw new Error('Fikk ikke kontakt med serveren. Sjekk nettverket og prøv igjen.', { cause });
  }
  if (!res.ok) throw new Error(saveErrorMessage(res.status));
}
