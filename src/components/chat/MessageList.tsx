'use client';

import { useEffect, useRef } from 'react';

import { cn } from '@/lib/utils';
import type { ChatMessage } from './types';
import styles from './MessageList.module.css';

type MessageListProps = {
  messages: ChatMessage[];
  /** Shows the "Assistenten skriver …" bubble while waiting for a reply. */
  isTyping?: boolean;
};

export function MessageList({ messages, isTyping = false }: MessageListProps) {
  const listRef = useRef<HTMLOListElement>(null);

  // Keep the newest message (or the typing bubble) in view.
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages.length, isTyping]);

  return (
    <ol ref={listRef} role="log" aria-live="polite" aria-label="Samtale" className={styles.list}>
      {messages.map((m) => (
        <li key={m.id} data-role={m.role} className={styles.message}>
          {/* Who is speaking, for users who can't rely on colour or position. */}
          <span className={styles.srOnly}>{m.role === 'user' ? 'Du:' : 'Assistent:'}</span>
          {m.content}
        </li>
      ))}
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
