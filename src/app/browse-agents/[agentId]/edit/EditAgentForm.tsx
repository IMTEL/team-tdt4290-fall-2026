'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';

import { MAX_NAME_LENGTH } from '@/domain/agentName';
import type { AgentTypeDefinition, Answers } from '@/domain/agentTypes/types';
import { updateAgent } from '../../api';
import styles from './EditAgentForm.module.css';

type SaveStatus = { kind: 'idle' } | { kind: 'saving' } | { kind: 'error'; message: string };

type EditAgentFormProps = {
  agentId: string;
  initialName: string;
  definition: AgentTypeDefinition;
  initialAnswers: Answers;
};

/**
 * Change an agent's name and answers. The fields come from the agent type, so the form works
 * for every type, and a field added to a type shows up here by itself.
 */
export function EditAgentForm({
  agentId,
  initialName,
  definition,
  initialAnswers,
}: EditAgentFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [answers, setAnswers] = useState(initialAnswers);
  const [status, setStatus] = useState<SaveStatus>({ kind: 'idle' });

  function setAnswer(key: string, value: string) {
    setAnswers((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ kind: 'saving' });
    try {
      await updateAgent(agentId, name.trim(), answers);
      router.push(`/browse-agents/${agentId}`);
    } catch (error) {
      // The form keeps what was typed, so nothing is lost and the counsellor can try again.
      // updateAgent only throws messages written for users.
      const message = error instanceof Error ? error.message : 'Noe gikk galt. Prøv igjen.';
      setStatus({ kind: 'error', message });
    }
  }

  const isSaving = status.kind === 'saving';
  const isComplete =
    name.trim() !== '' && definition.fields.every(({ key }) => answers[key]?.trim());

  return (
    <form className={styles.form} onSubmit={handleSubmit} aria-label="Rediger agent">
      <TextField
        label="Navn"
        value={name}
        onChange={(event) => setName(event.target.value)}
        required
        disabled={isSaving}
        slotProps={{ htmlInput: { maxLength: MAX_NAME_LENGTH } }}
      />

      {definition.fields.map(({ key, label }) => (
        <TextField
          key={key}
          label={label}
          value={answers[key] ?? ''}
          onChange={(event) => setAnswer(key, event.target.value)}
          required
          multiline
          disabled={isSaving}
        />
      ))}

      {status.kind === 'error' && <Alert severity="error">{status.message}</Alert>}

      <div className={styles.buttons}>
        <Button type="submit" variant="contained" disabled={isSaving || !isComplete}>
          {isSaving ? 'Lagrer …' : 'Lagre endringer'}
        </Button>
        <Button component={Link} href={`/browse-agents/${agentId}`} disabled={isSaving}>
          Avbryt
        </Button>
      </div>
    </form>
  );
}
