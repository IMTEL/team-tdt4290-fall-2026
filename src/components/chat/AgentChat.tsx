'use client';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';

import { ChatInput } from './ChatInput';
import { MessageList } from './MessageList';
import type { ChatMessage, SendMessages } from './types';
import { useChat } from './useChat';
import styles from './AgentChat.module.css';

type AgentChatProps = {
  /** Who answers: the configurator, the interviewer, or a fake in tests. */
  send: SendMessages;
  /** Shown before the user writes anything; also sent to the agent as the first turns. */
  initialMessages: ChatMessage[];
};

export function AgentChat({ send, initialMessages }: AgentChatProps) {
  const { messages, isWaiting, error, sendMessage, retry } = useChat(send, initialMessages);

  return (
    <div className={styles.chat}>
      <MessageList messages={messages} isTyping={isWaiting} />
      {error && (
        <Alert
          severity="error"
          className={styles.alert}
          action={
            <Button color="inherit" size="small" onClick={retry}>
              Prøv igjen
            </Button>
          }
        >
          {error}
        </Alert>
      )}
      <ChatInput onSend={sendMessage} disabled={isWaiting || error !== null} />
    </div>
  );
}
