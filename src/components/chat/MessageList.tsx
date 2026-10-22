'use client';

import { Fragment, useEffect, useRef, type ReactNode } from 'react';

import type { ParsedReply } from '@/domain/questionOptions';
import { cn } from '@/lib/utils';
import { QuestionOptions } from './QuestionOptions';
import type { ChatMessage } from './types';
import styles from './MessageList.module.css';

type MessageListProps = {
  messages: ChatMessage[];
  /** Shows the "Assistenten skriver …" bubble while waiting for a reply. */
  isTyping?: boolean;
  /** Sends a clicked answer. Without it, answer options are only shown as text. */
  onAnswer?: (text: string) => void;
  /** The answer options can't be used, e.g. while an error is shown. */
  answersDisabled?: boolean;
  /**
   * Splits an assistant reply into text and answer options, for agents that write options.
   * Without it, replies are shown as they are.
   */
  parseReply?: (content: string) => ParsedReply;
  /**
   * Shown under each assistant reply, e.g. buttons to rate it. Gets the reply and the user message
   * it answered, if any. Without it, nothing is shown.
   */
  renderReplyActions?: (reply: ChatMessage, userMessage: ChatMessage | undefined) => ReactNode;
};

export function MessageList({
  messages,
  isTyping = false,
  onAnswer,
  answersDisabled = false,
  parseReply,
  renderReplyActions,
}: MessageListProps) {
  const listRef = useRef<HTMLOListElement>(null);

  // Keep the newest message (or the typing bubble) in view.
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages.length, isTyping]);

  const last = messages.at(-1);

  return (
    <ol ref={listRef} role="log" aria-live="polite" aria-label="Samtale" className={styles.list}>
      {messages.map((m, index) => {
        const reply = m.role === 'assistant' && parseReply ? parseReply(m.content) : null;
        // Only the newest question can be answered by clicking; older options are just text.
        const answer = m === last && !isTyping ? onAnswer : undefined;
        const options = answer ? reply?.options : null;
        const previous = messages[index - 1];
        const actions =
          m.role === 'assistant' && renderReplyActions
            ? renderReplyActions(m, previous?.role === 'user' ? previous : undefined)
            : null;

        return (
          <Fragment key={m.id}>
            <li data-role={m.role} className={styles.message}>
              {/* Who is speaking, for users who can't rely on colour or position. */}
              <span className={styles.srOnly}>{m.role === 'user' ? 'Du:' : 'Assistent:'}</span>
              {reply ? (options ? reply.text : asText(reply)) : m.content}
            </li>
            {/* Not a message: role="none" keeps it out of the list's count, and aria-live="off"
                stops the log from reading out every change in it as new conversation. */}
            {actions && (
              <li role="none" className={styles.replyActions}>
                <div aria-live="off">{actions}</div>
              </li>
            )}
            {answer && options && (
              <li className={styles.options}>
                <QuestionOptions options={options} onAnswer={answer} disabled={answersDisabled} />
              </li>
            )}
          </Fragment>
        );
      })}
      {isTyping && (
        <li data-role="assistant" className={cn(styles.message, styles.typing)}>
          <span className={styles.srOnly}>Assistenten skriver …</span>
          <span className={styles.dots} aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </li>
      )}
    </ol>
  );
}

/** A reply with its options written out as a numbered list, the way the agent numbered them. */
function asText({ text, options }: ParsedReply): string {
  if (!options) return text;
  const lines = options.choices.map((choice) => `${choice.number}. ${choice.label}`);
  return [text, ...lines].join('\n');
}
