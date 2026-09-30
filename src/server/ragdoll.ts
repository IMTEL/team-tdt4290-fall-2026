// Adapter for RAGdoll's API. Server only: it uses the agents' access keys.

export type RagdollAgent = { id: string; accessKey: string };
export type RagdollMessage = { role: 'user' | 'assistant'; content: string };

export type RagdollErrorKind = 'config' | 'timeout' | 'unreachable' | 'bad-response';

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
