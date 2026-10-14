'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
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
  /** Shown above the name field, e.g. the configuration that will be saved. */
  children?: ReactNode;
  /** The counsellor wants to change something, or is done after saving: close the pop-up. */
  onClose: () => void;
};

/**
 * The body and buttons of the pop-up shown once the configurator has finished: name the
 * interviewer and save it. Goes inside a MUI Dialog, so the buttons sit at the bottom of it.
 */
export function SaveAgentForm({
  configuration,
  sources = {},
  children,
  onClose,
}: SaveAgentFormProps) {
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

  const isSaved = status.kind === 'saved';
  const isSaving = status.kind === 'saving';

  return (
    <form className={styles.form} onSubmit={handleSubmit} aria-label="Lagre intervjueren">
      <DialogContent dividers className={styles.content}>
        {children}
        {isSaved ? (
          <Alert severity="success">
            «{name.trim()}» er lagret.{' '}
            <Link href={`/test-chat?agent=${encodeURIComponent(status.id)}`}>
              Test intervjueren
            </Link>{' '}
            eller <Link href="/browse-agents">se agentene dine</Link>
          </Alert>
        ) : (
          <>
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
          </>
        )}
      </DialogContent>
      <DialogActions>
        {isSaved ? (
          <Button variant="contained" onClick={onClose}>
            Lukk
          </Button>
        ) : (
          <>
            <Button variant="outlined" onClick={onClose} disabled={isSaving}>
              Nei, jeg vil endre noe
            </Button>
            <Button type="submit" variant="contained" disabled={isSaving || name.trim() === ''}>
              {isSaving ? 'Lagrer …' : 'Lagre agent'}
            </Button>
          </>
        )}
      </DialogActions>
    </form>
  );
}
