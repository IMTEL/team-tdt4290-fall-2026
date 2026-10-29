'use client';

import { useEffect, type ReactNode } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';

import type { ParsedReply } from '@/domain/questionOptions';
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
  /** For agents that write answer options: splits a reply into text and options. */
  parseReply?: (content: string) => ParsedReply;
  /** Shown under each assistant reply, e.g. buttons to rate it. See MessageList. */
  renderReplyActions?: (reply: ChatMessage, userMessage: ChatMessage | undefined) => ReactNode;
  /** Called with the conversation whenever it changes, for a page that does more with it. */
  onMessagesChange?: (messages: ChatMessage[]) => void;
};

export function AgentChat({
  send,
  initialMessages,
  parseReply,
  renderReplyActions,
  onMessagesChange,
}: AgentChatProps) {
  const { messages, isWaiting, error, sendMessage, retry } = useChat(send, initialMessages);

  useEffect(() => {
    onMessagesChange?.(messages);
  }, [messages, onMessagesChange]);

  return (
    <div className={styles.chat}>
      <MessageList
        messages={messages}
        isTyping={isWaiting}
        onAnswer={sendMessage}
        answersDisabled={error !== null}
        parseReply={parseReply}
        renderReplyActions={renderReplyActions}
      />
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
      {/* Always open, so the user can also write something of their own instead of answering. */}
      <ChatInput onSend={sendMessage} disabled={isWaiting || error !== null} />
    </div>
  );
}
