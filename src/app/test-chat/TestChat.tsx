'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { fetchAgents } from '@/app/browse-agents/api';
import { AgentChat } from '@/components/chat/AgentChat';
import { sendToAgent } from '@/components/chat/sendToAgent';
import type { ChatMessage, SendMessages } from '@/components/chat/types';
import { RateReply } from './RateReply';
import styles from './TestChat.module.css';

// The interviewer opens the interview. Fixed text, so it costs no LLM call. It is also sent to
// RAGdoll as the first turn, so the agent doesn't greet again.
// Keep it in sync with the "Samtalen så langt" section in src/domain/interviewerPrompt.ts.
const initialMessages: ChatMessage[] = [
  {
    id: 'greeting',
    role: 'assistant',
    content: 'Hei, og velkommen til intervjuet. Kan du starte med å fortelle litt om deg selv?',
  },
];

// The result of looking the agent up, and for which id, so a new id shows "loading" again.
type Lookup = { agentId: string; kind: 'ready' | 'missing' | 'error' };

// A client component because page.tsx (a server component) can't pass a function to AgentChat.
export function TestChat({ agentId }: { agentId: string }) {
  // A new key mounts a fresh AgentChat: the conversation goes back to the greeting, and a reply
  // still on its way is cancelled (AgentChat aborts it when it unmounts).
  const [round, setRound] = useState(0);
  const [lookup, setLookup] = useState<Lookup | null>(null);

  // Only the counsellor's own agents can be tested. The list has only theirs, so an id that is not
  // in it is either deleted, never existed, or belongs to someone else. Same check as AgentDetail.
  useEffect(() => {
    let cancelled = false;
    fetchAgents()
      .then((agents) => {
        if (cancelled) return;
        const found = agents.some((agent) => agent.id === agentId);
        setLookup({ agentId, kind: found ? 'ready' : 'missing' });
      })
      .catch(() => {
        if (!cancelled) setLookup({ agentId, kind: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [agentId]);

  // The same function on every render, unless the agent changes.
  const askInterviewer = useCallback<SendMessages>(
    (messages, signal) => sendToAgent(agentId, messages, signal),
    [agentId],
  );

  // Every reply to the counsellor can be rated. The greeting answers nobody: it is fixed text, not
  // written by the agent, so there is nothing to teach it there.
  const renderRating = useCallback(
    (reply: ChatMessage, userMessage: ChatMessage | undefined) =>
      userMessage && (
        <RateReply agentId={agentId} reply={reply.content} userMessage={userMessage.content} />
      ),
    [agentId],
  );

  const status = lookup?.agentId === agentId ? lookup.kind : 'loading';

  if (status === 'loading') {
    // English translation: Loading the interviewer …
    return <Typography>Laster intervjueren …</Typography>;
  }

  if (status === 'missing') {
    return (
      <Alert severity="warning">
        {/* English translation: Could not find the interviewer. It may have been deleted. Choose
        another one from your agents. */}
        Fant ikke intervjueren. Den kan være slettet. Velg en annen fra{' '}
        <Link href="/browse-agents">agentene dine</Link>.
      </Alert>
    );
  }

  if (status === 'error') {
    return <Alert severity="error">Noe gikk galt. Prøv igjen.</Alert>;
  }

  return (
    <div className={styles.testChat}>
      <div className={styles.toolbar}>
        <Button variant="outlined" size="small" onClick={() => setRound((r) => r + 1)}>
          Start på nytt
        </Button>
      </div>
      {/* The agent is in the key too, so another agent starts a new conversation. */}
      <AgentChat
        key={`${agentId}-${round}`}
        send={askInterviewer}
        initialMessages={initialMessages}
        renderReplyActions={renderRating}
      />
    </div>
  );
}
