'use client';

import { useState, type FormEvent, type KeyboardEvent } from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';

import styles from './ChatInput.module.css';

type ChatInputProps = {
  onSend: (text: string) => void;
  /** The user can't send a second message while the agent is answering */
  disabled?: boolean;
};

export function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const [text, setText] = useState('');
  const canSend = !disabled && text.trim() !== '';

  function submit() {
    if (!canSend) return;
    onSend(text.trim());
    setText('');
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    submit();
  }

  // Enter sends, Shift+Enter adds a new line.
  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <TextField
        multiline
        minRows={1}
        maxRows={6}
        fullWidth
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Skriv svaret ditt …"
        slotProps={{ htmlInput: { 'aria-label': 'Melding' } }}
      />
      <Button type="submit" variant="contained" disabled={!canSend}>
        Send
      </Button>
    </form>
  );
}
