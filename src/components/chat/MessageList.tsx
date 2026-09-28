import type { ChatMessage } from './types';
import styles from './MessageList.module.css';

type MessageListProps = {
  messages: ChatMessage[];
};

export function MessageList({ messages }: MessageListProps) {
  return (
    <ol role="log" aria-live="polite" aria-label="Samtale" className={styles.list}>
      {messages.map((m) => (
        <li key={m.id} data-role={m.role} className={styles.message}>
          {/* Who is speaking, for users who can't rely on colour or position. */}
          <span className={styles.srOnly}>{m.role === 'user' ? 'Du:' : 'Assistent:'}</span>
          {m.content}
        </li>
      ))}
    </ol>
  );
}
