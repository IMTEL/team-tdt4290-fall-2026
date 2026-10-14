'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';

import { ChatError } from '@/components/chat/sendToAgent';
import type { AnswerSources } from '@/domain/agentTypes/types';
import type { Configuration } from '@/domain/configuration';
import { saveConfiguredAgent } from './api';
import styles from './SaveAgentForm.module.css';

// Same limit as POST /api/agents.
const MAX_NAME_LENGTH = 100;

type SaveStatus =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved'; id: string }
  | { kind: 'error'; message: string };

type SaveAgentFormProps = {
  configuration: Configuration;
  /** The template and profile the answers came from, so the edit form can show them later. */
  sources?: AnswerSources;
};

/** Shown under the chat once the configurator has finished: name the interviewer and save it. */
export function SaveAgentForm({ configuration, sources = {} }: SaveAgentFormProps) {
  const [name, setName] = useState(`Intervjuer for ${configuration.stilling}`);
  const [status, setStatus] = useState<SaveStatus>({ kind: 'idle' });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ kind: 'saving' });
    try {
      const id = await saveConfiguredAgent(name.trim(), configuration, sources);
      setStatus({ kind: 'saved', id });
    } catch (error) {
      // Only ChatError messages are written for users; anything else could be technical.
      setStatus({
        kind: 'error',
        message: error instanceof ChatError ? error.userMessage : 'Noe gikk galt. Prøv igjen.',
      });
    }
  }

  if (status.kind === 'saved') {
    return (
      <Alert severity="success">
        «{name.trim()}» er lagret.{' '}
        <Link href={`/test-chat?agent=${encodeURIComponent(status.id)}`}>Test intervjueren</Link>{' '}
        eller <Link href="/browse-agents">se agentene dine</Link>
      </Alert>
    );
  }

  const isSaving = status.kind === 'saving';

  return (
    <form className={styles.form} onSubmit={handleSubmit} aria-label="Lagre intervjueren">
      <p className={styles.lead}>Intervjueren er klar. Gi den et navn og lagre den.</p>
      <TextField
        label="Navn på intervjueren"
        value={name}
        onChange={(event) => setName(event.target.value)}
        size="small"
        required
        disabled={isSaving}
        slotProps={{ htmlInput: { maxLength: MAX_NAME_LENGTH } }}
      />
      {status.kind === 'error' && <Alert severity="error">{status.message}</Alert>}
      <Button
        type="submit"
        variant="contained"
        className={styles.button}
        disabled={isSaving || name.trim() === ''}
      >
        {isSaving ? 'Lagrer …' : 'Lagre agent'}
      </Button>
    </form>
  );
}
