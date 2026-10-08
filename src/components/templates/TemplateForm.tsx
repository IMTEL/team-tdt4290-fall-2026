'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';

import { TEMPLATE_LIMITS } from '@/data/interviewer-templates';
import type { NewTemplate } from './api';
import styles from './TemplateForm.module.css';

type SaveStatus =
  { kind: 'idle' } | { kind: 'saving' } | { kind: 'saved' } | { kind: 'error'; message: string };

/** The focus areas typed as one comma-separated line, without empty ones. */
export function parseFocus(text: string): string[] {
  return text
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

type TemplateFormProps = {
  /** The template to edit. Leave it out to make a new one. */
  initial?: NewTemplate;
  /** Saves the template. Throws Error with a Norwegian message that can be shown as it is. */
  onSave: (template: NewTemplate) => Promise<void>;
};

/** A form for an interviewer template, new or saved. Saved templates show up on /configure. */
export function TemplateForm({ initial, onSave }: TemplateFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [focusText, setFocusText] = useState(initial?.focus.join(', ') ?? '');
  const [persona, setPersona] = useState(initial?.persona ?? '');
  const [status, setStatus] = useState<SaveStatus>({ kind: 'idle' });

  const focus = parseFocus(focusText);
  const focusError =
    focus.length > TEMPLATE_LIMITS.focusItems
      ? `Skriv høyst ${TEMPLATE_LIMITS.focusItems} fokusområder.`
      : focus.some((item) => item.length > TEMPLATE_LIMITS.focusItem)
        ? `Hvert fokusområde kan ha høyst ${TEMPLATE_LIMITS.focusItem} tegn.`
        : null;
  const isComplete = Boolean(title.trim() && description.trim() && persona.trim());

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ kind: 'saving' });
    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        focus,
        persona: persona.trim(),
      });
      setStatus({ kind: 'saved' });
    } catch (error) {
      setStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Noe gikk galt. Prøv igjen.',
      });
    }
  }

  if (status.kind === 'saved') {
    return (
      <Alert severity="success">
        Malen «{title.trim()}» er lagret.{' '}
        <Link href="/configure">Bruk den til å sette opp en intervjuer</Link>
      </Alert>
    );
  }

  const isSaving = status.kind === 'saving';

  return (
    <form
      className={styles.form}
      onSubmit={handleSubmit}
      aria-label={initial ? 'Rediger malen' : 'Lag en mal'}
    >
      <TextField
        label="Navn på malen"
        helperText="Hvem er intervjueren? For eksempel «Butikksjef»."
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        required
        disabled={isSaving}
        slotProps={{ htmlInput: { maxLength: TEMPLATE_LIMITS.title } }}
      />
      <TextField
        label="Kort beskrivelse"
        helperText="Én setning om hvordan intervjueren er. Vises på kortet."
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        required
        disabled={isSaving}
        slotProps={{ htmlInput: { maxLength: TEMPLATE_LIMITS.description } }}
      />
      <TextField
        label="Fokusområder"
        helperText={
          focusError ??
          `Skill med komma, for eksempel «Service, Samarbeid». Høyst ${TEMPLATE_LIMITS.focusItems}.`
        }
        error={focusError !== null}
        value={focusText}
        onChange={(event) => setFocusText(event.target.value)}
        disabled={isSaving}
      />
      <TextField
        label="Beskrivelse av intervjueren"
        helperText="Hvem intervjueren er, hvordan hen oppfører seg og hva hen spør om. Assistenten bruker denne teksten."
        value={persona}
        onChange={(event) => setPersona(event.target.value)}
        required
        multiline
        minRows={4}
        disabled={isSaving}
        slotProps={{ htmlInput: { maxLength: TEMPLATE_LIMITS.persona } }}
      />
      {status.kind === 'error' && <Alert severity="error">{status.message}</Alert>}
      <div className={styles.actions}>
        <Button
          type="submit"
          variant="contained"
          disabled={isSaving || !isComplete || focusError !== null}
        >
          {isSaving ? 'Lagrer …' : initial ? 'Lagre endringene' : 'Lagre mal'}
        </Button>
        <Button component={Link} href="/configure" disabled={isSaving}>
          Avbryt
        </Button>
      </div>
    </form>
  );
}
