type ChatMessage = { role: 'user' | 'assistant'; content: string };

function isChatMessage(value: unknown): value is ChatMessage {
  if (typeof value !== 'object' || value === null) return false;
  const { role, content } = value as Record<string, unknown>;
  return (role === 'user' || role === 'assistant') && typeof content === 'string';
}

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

  const ragdollApiUrl = process.env.RAGDOLL_API_URL;
  const ragdollAgentId = process.env.RAGDOLL_AGENT_ID;
  const ragdollAccessKey = process.env.RAGDOLL_ACCESS_KEY;

  if (!ragdollApiUrl || !ragdollAgentId || !ragdollAccessKey) {
    console.error('Missing RAGdoll configuration in environment variables');
    return Response.json({ error: 'Server configuration error' }, { status: 500 });
  }

  try {
    const res = await fetch(`${ragdollApiUrl}/api/chat/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent_id: ragdollAgentId,
        access_key: ragdollAccessKey,
        chat_log: messages,
      }),
      signal: AbortSignal.timeout(30000), // 30 seconds timeout
    });

    if (!res.ok) {
      console.error('Error from RAGdoll API:', res.status, await res.text());
      return Response.json({ error: 'Error from RAGdoll API' }, { status: 502 });
    }

    // RAGdoll wraps the pipeline result: { response: { id, model, context_used, ..., response: '<text>' } }
    const data = await res.json();
    const reply = data?.response?.response;

    if (typeof reply !== 'string') {
      console.error('Invalid response from RAGdoll API:', data);
      return Response.json({ error: 'Invalid response from RAGdoll API' }, { status: 502 });
    }

    return Response.json({ response: reply });
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      console.error('Request to RAGdoll API timed out:', error);
      return Response.json({ error: 'Request to RAGdoll API timed out' }, { status: 504 });
    }
    console.error('Error forwarding request to RAGdoll API:', error);
    return Response.json({ error: 'Error forwarding request to RAGdoll API' }, { status: 502 });
  }
}
