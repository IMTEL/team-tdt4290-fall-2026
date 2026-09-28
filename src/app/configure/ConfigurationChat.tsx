'use client';

import { useState } from 'react';

import { ChatInput } from '@/components/chat/ChatInput';
import { MessageList } from '@/components/chat/MessageList';
import type { ChatMessage } from '@/components/chat/types';

// The assistant opens the conversation. Fixed text for now, so it costs no LLM call.
const initialMessages: ChatMessage[] = [
  {
    id: 'greeting',
    role: 'assistant',
    content:
      'Hei! Jeg hjelper deg med å sette opp en AI-intervjuer. Hvilken stilling skal jobbsøkeren øve til?',
  },
];

export function ConfigurationChat() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);

  function handleSend(text: string) {
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: text };
    // New array (not push) so React re-renders; (prev) => so we never use a stale list.
    setMessages((prev) => [...prev, userMessage]);
  }

  return (
    <>
      <MessageList messages={messages} />
      <ChatInput onSend={handleSend} />
    </>
  );
}
