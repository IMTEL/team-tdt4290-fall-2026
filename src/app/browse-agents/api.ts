import type { Agent } from '@/lib/types';

const GENERIC_ERROR = 'Noe gikk galt. Prøv igjen.';

function isAgent(value: unknown): value is Agent {
  if (typeof value !== 'object' || value === null) return false;
  const agent = value as Record<string, unknown>;
  return (
    typeof agent.id === 'string' &&
    typeof agent.name === 'string' &&
    typeof agent.description === 'string' &&
    typeof agent.lastUpdated === 'string'
  );
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
