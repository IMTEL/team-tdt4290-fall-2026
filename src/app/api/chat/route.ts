import { askAgent, RagdollError, type RagdollErrorKind } from '@/server/ragdoll';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

function isChatMessage(value: unknown): value is ChatMessage {
  if (typeof value !== 'object' || value === null) return false;
  const { role, content } = value as Record<string, unknown>;
  return (role === 'user' || role === 'assistant') && typeof content === 'string';
}

// What the browser gets for each RAGdoll failure. Never RAGdoll's own message.
const errorResponses: Record<RagdollErrorKind, { status: number; error: string }> = {
  config: { status: 500, error: 'Server configuration error' },
  timeout: { status: 504, error: 'Request to RAGdoll API timed out' },
  unreachable: { status: 502, error: 'Error from RAGdoll API' },
  'bad-response': { status: 502, error: 'Invalid response from RAGdoll API' },
};

// Forwards the chat history to RAGdoll from the server, so the access key never reaches the browser.
export async function POST(request: Request) {
  let messages: ChatMessage[];
  try {
    const body = await request.json();
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

  const agentId = process.env.RAGDOLL_AGENT_ID;
  const accessKey = process.env.RAGDOLL_ACCESS_KEY;
  if (!agentId || !accessKey) {
    console.error('Missing RAGdoll agent settings in environment variables');
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
