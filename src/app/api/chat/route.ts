import { askAgent, RagdollError, type RagdollErrorKind } from '@/server/ragdoll';
import { AGENT_NAMES, type AgentName } from '@/lib/agents';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

function isChatMessage(value: unknown): value is ChatMessage {
  if (typeof value !== 'object' || value === null) return false;
  const { role, content } = value as Record<string, unknown>;
  return (role === 'user' || role === 'assistant') && typeof content === 'string';
}

function isAgentName(value: unknown): value is AgentName {
  return AGENT_NAMES.includes(value as AgentName);
}

const agentEnv: Record<AgentName, { id: string; key: string }> = {
  configurator: { id: 'RAGDOLL_CONFIGURATOR_AGENT_ID', key: 'RAGDOLL_CONFIGURATOR_ACCESS_KEY' },
  interviewer: { id: 'RAGDOLL_INTERVIEWER_AGENT_ID', key: 'RAGDOLL_INTERVIEWER_ACCESS_KEY' },
};

// What the browser gets for each RAGdoll failure. Never RAGdoll's own message.
const errorResponses: Record<RagdollErrorKind, { status: number; error: string }> = {
  config: { status: 500, error: 'Server configuration error' },
  timeout: { status: 504, error: 'Request to RAGdoll API timed out' },
  unreachable: { status: 502, error: 'Error from RAGdoll API' },
  'bad-response': { status: 502, error: 'Invalid response from RAGdoll API' },
  unauthorized: { status: 401, error: 'Not signed in' },
};

// Forwards the chat history to RAGdoll from the server, so the access key never reaches the browser.
export async function POST(request: Request) {
  let agent: AgentName;
  let messages: ChatMessage[];
  try {
    const body = await request.json();
    if (!isAgentName(body?.agent)) {
      return Response.json({ error: 'Invalid agent in request body' }, { status: 400 });
    }
    agent = body.agent;
    if (
      !Array.isArray(body?.messages) ||
      body.messages.length === 0 ||
      !body.messages.every(isChatMessage)
    ) {
      return Response.json({ error: 'Invalid messages in request body' }, { status: 400 });
    }
    messages = body.messages;
  } catch (error) {
    console.error('Error parsing request body:', error);
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const agentId = process.env[agentEnv[agent].id];
  const accessKey = process.env[agentEnv[agent].key];
  if (!agentId || !accessKey) {
    console.error(`Missing RAGdoll settings for the ${agent} agent in environment variables`);
    return Response.json({ error: errorResponses.config.error }, { status: 500 });
  }

  try {
    const reply = await askAgent({ id: agentId, accessKey }, messages);
    return Response.json({ response: reply });
  } catch (error) {
    console.error('Error asking the RAGdoll agent:', error);
    // Anything that is not a RagdollError is a bug in our code, not a RAGdoll problem.
    const { status, error: message } =
      error instanceof RagdollError
        ? errorResponses[error.kind]
        : { status: 500, error: 'Internal server error' };
    return Response.json({ error: message }, { status });
  }
}
