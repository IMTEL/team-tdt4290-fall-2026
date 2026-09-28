'use client';

import { useEffect, useRef, useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';

import { ChatInput } from '@/components/chat/ChatInput';
import { MessageList } from '@/components/chat/MessageList';
import { ChatError, sendToAgent } from '@/components/chat/sendToAgent';
import type { ChatMessage } from '@/components/chat/types';
import styles from './ConfigurationChat.module.css';

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

export function ConfigurationChat() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);

  // Cancel a pending request if the user leaves the page.
  useEffect(() => () => requestRef.current?.abort(), []);

  async function requestReply(history: ChatMessage[]) {
    const controller = new AbortController();
    requestRef.current = controller;
    setIsLoading(true);
    setError(null);

    try {
      const reply = await sendToAgent('configurator', history, controller.signal);
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', content: reply },
      ]);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof ChatError ? err.userMessage : 'Noe gikk galt. Prøv igjen.');
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        setIsLoading(false);
      }
    }
  }

  function handleSend(text: string) {
    // Sending is disabled while loading, so `messages` is always up to date here.
    const history = [
      ...messages,
      { id: crypto.randomUUID(), role: 'user' as const, content: text },
    ];
    setMessages(history);
    void requestReply(history);
  }

  // The user's last message is already in the list, so retrying just asks again.
  // This way the history never has two user turns in a row.
  function handleRetry() {
    void requestReply(messages);
  }

  return (
    <>
      <MessageList messages={messages} isTyping={isLoading} />
      {error && (
        <Alert
          severity="error"
          className={styles.alert}
          action={
            <Button color="inherit" size="small" onClick={handleRetry}>
              Prøv igjen
            </Button>
          }
        >
          {error}
        </Alert>
      )}
      <ChatInput onSend={handleSend} disabled={isLoading || error !== null} />
    </>
  );
}
