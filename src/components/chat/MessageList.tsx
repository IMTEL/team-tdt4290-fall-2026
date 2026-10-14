'use client';

import { Fragment, useEffect, useRef } from 'react';

import { parseQuestionOptions, type ParsedReply } from '@/domain/questionOptions';
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
};

export function MessageList({
  messages,
  isTyping = false,
  onAnswer,
  answersDisabled = false,
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
      {messages.map((m) => {
        const reply = m.role === 'assistant' ? parseQuestionOptions(m.content) : null;
        // Only the newest question can be answered by clicking; older options are just text.
        const answer = m === last && !isTyping ? onAnswer : undefined;
        const options = answer ? reply?.options : null;

        return (
          <Fragment key={m.id}>
            <li data-role={m.role} className={styles.message}>
              {/* Who is speaking, for users who can't rely on colour or position. */}
              <span className={styles.srOnly}>{m.role === 'user' ? 'Du:' : 'Assistent:'}</span>
              {reply ? (options ? reply.text : asText(reply)) : m.content}
            </li>
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
