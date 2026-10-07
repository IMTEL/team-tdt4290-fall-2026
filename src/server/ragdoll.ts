// Adapter for RAGdoll's API. Server only: it uses the agents' access keys.

export type RagdollAgent = { id: string; accessKey: string };
export type RagdollMessage = { role: 'user' | 'assistant'; content: string };

export type RagdollErrorKind =
  'config' | 'timeout' | 'unreachable' | 'bad-response' | 'unauthorized' | 'not-found';

/** A failure talking to RAGdoll. `message` is technical and only meant for the server log. */
export class RagdollError extends Error {
  constructor(
    readonly kind: RagdollErrorKind,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = 'RagdollError';
  }
}

const TIMEOUT_MS = 30000;

/** Sends the chat history to a RAGdoll agent and returns the reply text. Throws RagdollError. */
export async function askAgent(agent: RagdollAgent, messages: RagdollMessage[]): Promise<string> {
  const apiUrl = process.env.RAGDOLL_API_URL;
  if (!apiUrl) {
    throw new RagdollError('config', 'RAGDOLL_API_URL is not set');
  }

  let res: Response;
  try {
    res = await fetch(`${apiUrl}/api/chat/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent_id: agent.id,
        access_key: agent.accessKey,
        chat_log: messages,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (cause) {
    if (cause instanceof Error && cause.name === 'TimeoutError') {
      throw new RagdollError('timeout', `No answer from RAGdoll after ${TIMEOUT_MS} ms`, {
        cause,
      });
    }
    throw new RagdollError('unreachable', 'Could not reach RAGdoll', { cause });
  }

  if (!res.ok) {
    throw new RagdollError('unreachable', `RAGdoll answered ${res.status}: ${await res.text()}`);
  }

  // RAGdoll wraps the pipeline result: { response: { id, model, context_used, ..., response: '<text>' } }
  const data = await res.json().catch(() => null);
  const reply = data?.response?.response;
  if (typeof reply !== 'string') {
    throw new RagdollError(
      'bad-response',
      `Unexpected response from RAGdoll: ${JSON.stringify(data)}`,
    );
  }

  return reply;
}

/** A role in a RAGdoll agent. The Candidate shows each role as an interviewer. */
export type RagdollRole = {
  name: string;
  description: string;
  document_access: string[];
  function_access: string[];
};

/** What we send to RAGdoll to create an agent. The fields follow RAGdoll's Agent model. */
export type NewRagdollAgent = {
  name: string;
  description: string;
  prompt: string;
  roles: RagdollRole[];
  llm_provider: string;
  llm_model: string;
  llm_api_key: string;
  embedding_model: string;
  embedding_api_key: string;
  context_aware_retrieval: boolean;
  last_updated: string;
};

/**
 * A whole agent as RAGdoll gives it to its owner, with the keys. Never send it to the browser.
 * It also has fields we don't use. We keep them, because an update resets every field we leave out.
 */
export type FullRagdollAgent = NewRagdollAgent & { id: string; [field: string]: unknown };

/** An agent as we pass it on. Only safe fields: RAGdoll also returns the agent's keys. */
export type RagdollAgentSummary = {
  id: string;
  name: string;
  description: string;
  lastUpdated: string;
};

/**
 * Calls RAGdoll as the logged-in user, with their session token. Throws RagdollError.
 * Goes to BACKEND_API_URL: the RAGdoll the user logged in to.
 */
async function requestAsUser(
  sessionToken: string,
  path: string,
  init: RequestInit = {},
): Promise<unknown> {
  const apiUrl = process.env.BACKEND_API_URL;
  if (!apiUrl) {
    throw new RagdollError('config', 'BACKEND_API_URL is not set');
  }

  let res: Response;
  try {
    res = await fetch(`${apiUrl.replace(/\/$/, '')}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (cause) {
    if (cause instanceof Error && cause.name === 'TimeoutError') {
      throw new RagdollError('timeout', `No answer from RAGdoll after ${TIMEOUT_MS} ms`, {
        cause,
      });
    }
    throw new RagdollError('unreachable', 'Could not reach RAGdoll', { cause });
  }

  // RAGdoll answers 401 for an expired token and 422 for a missing or broken one.
  if (res.status === 401 || res.status === 422) {
    throw new RagdollError('unauthorized', `RAGdoll answered ${res.status}: ${await res.text()}`);
  }
  if (!res.ok) {
    throw new RagdollError('unreachable', `RAGdoll answered ${res.status}: ${await res.text()}`);
  }

  const data = await res.json().catch(() => null);
  if (data === null) {
    throw new RagdollError('bad-response', 'RAGdoll did not answer with JSON');
  }
  return data;
}

/** Creates an agent owned by the logged-in user and returns its new id. */
export async function saveAgent(sessionToken: string, agent: NewRagdollAgent): Promise<string> {
  // No `id` in the body: that is how RAGdoll knows to create, not update.
  const data = await requestAsUser(sessionToken, '/update-agent/', {
    method: 'POST',
    body: JSON.stringify(agent),
  });

  const id = (data as { id?: unknown }).id;
  if (typeof id !== 'string') {
    throw new RagdollError('bad-response', 'RAGdoll did not return the new agent id');
  }
  return id;
}

/** Lists the agents the logged-in user owns or collaborates on. Throws RagdollError. */
export async function listAgents(sessionToken: string): Promise<RagdollAgentSummary[]> {
  const data = await requestAsUser(sessionToken, '/agents/');
  if (!Array.isArray(data)) {
    throw new RagdollError('bad-response', 'RAGdoll did not return a list of agents');
  }

  // Pick out only the fields we need. This also leaves the agents' API keys behind.
  return data.map(toSummary);
}

/** Only the fields we pass on. This also leaves the agent's API keys behind. */
function toSummary(agent: Record<string, unknown>): RagdollAgentSummary {
  return {
    id: String(agent.id),
    name: String(agent.name),
    description: String(agent.description),
    lastUpdated: String(agent.last_updated),
  };
}

/**
 * The whole agent with this id, keys included, if it is one of the logged-in user's agents.
 * Throws RagdollError, with kind 'not-found' if the user has no agent with this id.
 */
export async function fetchFullAgent(
  sessionToken: string,
  agentId: string,
): Promise<FullRagdollAgent> {
  // Not /fetch-agent: it answers 401 both when the session has expired and when the agent is not
  // the user's, or does not exist. The list only has the user's own agents, so we look there.
  const data = await requestAsUser(sessionToken, '/agents/');
  if (!Array.isArray(data)) {
    throw new RagdollError('bad-response', 'RAGdoll did not return a list of agents');
  }

  const agent = data.find((item) => item?.id === agentId);
  if (!agent) {
    throw new RagdollError('not-found', `The user has no agent with id ${agentId}`);
  }
  return agent as FullRagdollAgent;
}

/** Saves changes to an existing agent, and returns it without the keys. Throws RagdollError. */
export async function updateAgent(
  sessionToken: string,
  agent: FullRagdollAgent,
): Promise<RagdollAgentSummary> {
  // The `id` in the body tells RAGdoll to update that agent instead of creating a new one.
  // Empty keys tell RAGdoll to keep the stored ones, so the keys never travel back.
  const data = await requestAsUser(sessionToken, '/update-agent/', {
    method: 'POST',
    body: JSON.stringify({ ...agent, llm_api_key: '', embedding_api_key: '' }),
  });

  if (typeof (data as { id?: unknown }).id !== 'string') {
    throw new RagdollError('bad-response', 'RAGdoll did not return the updated agent');
  }
  return toSummary(data as Record<string, unknown>);
}
