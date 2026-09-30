'use client';

import { useState } from 'react';
import Button from '@mui/material/Button';

import { AgentChat } from '@/components/chat/AgentChat';
import { sendToAgent } from '@/components/chat/sendToAgent';
import type { ChatMessage, SendMessages } from '@/components/chat/types';
import styles from './TestChat.module.css';

// The interviewer opens the interview. Fixed text, so it costs no LLM call. It is also sent to
// RAGdoll as the first turn, so the agent doesn't greet again.
// Keep it in sync with the "Samtalen så langt" section of prompts/interviewer.nb.md.
const initialMessages: ChatMessage[] = [
  {
    id: 'greeting',
    role: 'assistant',
    content: 'Hei, og velkommen til intervjuet. Kan du starte med å fortelle litt om deg selv?',
  },
];

// Outside the component, so it is the same function on every render.
const askInterviewer: SendMessages = (messages, signal) =>
  sendToAgent('interviewer', messages, signal);

// A client component because page.tsx (a server component) can't pass a function to AgentChat.
export function TestChat() {
  // A new key mounts a fresh AgentChat: the conversation goes back to the greeting, and a reply
  // still on its way is cancelled (AgentChat aborts it when it unmounts).
  const [round, setRound] = useState(0);

  return (
    <div className={styles.testChat}>
      <div className={styles.toolbar}>
        <Button variant="outlined" size="small" onClick={() => setRound((r) => r + 1)}>
          Start på nytt
        </Button>
      </div>
      <AgentChat key={round} send={askInterviewer} initialMessages={initialMessages} />
    </div>
  );
}
