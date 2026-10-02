'use client';

import { AgentChat } from '@/components/chat/AgentChat';
import { sendToAgent } from '@/components/chat/sendToAgent';
import type { ChatMessage, SendMessages } from '@/components/chat/types';

// The assistant opens the conversation. Fixed text, so it costs no LLM call. It is also sent to
// RAGdoll as the first turn, so the agent doesn't greet again.
const initialMessages: ChatMessage[] = [
  {
    id: 'greeting',
    role: 'assistant',
    content:
      'Hei! Jeg hjelper deg med å sette opp en AI-intervjuer. Hvilken stilling skal jobbsøkeren øve til?',
  },
];

// Outside the component, so it is the same function on every render.
const askConfigurator: SendMessages = (messages, signal) =>
  sendToAgent('configurator', messages, signal);

// A client component because page.tsx (a server component) can't pass a function to AgentChat.
export function ConfigurationChat() {
  return <AgentChat send={askConfigurator} initialMessages={initialMessages} />;
}
