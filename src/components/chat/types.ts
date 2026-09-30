export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

/** Sends the conversation to an agent and returns its reply. This is how a chat knows who answers. */
export type SendMessages = (messages: ChatMessage[], signal: AbortSignal) => Promise<string>;
