'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';

import { templatesSectionHref } from '@/app/templates/sectionOpen';
import { LEGAL_TEMPLATE_LIMITS as LIMITS, type NewLegalTemplate } from '@/domain/legalTemplate';
import styles from '@/components/profiles/ProfileForm.module.css';

type SaveStatus =
  { kind: 'idle' } | { kind: 'saving' } | { kind: 'saved' } | { kind: 'error'; message: string };

type LegalTemplateFormProps = {
  /** The template to edit. Leave it out to make a new one. */
  initial?: NewLegalTemplate;
  /** Saves the template. Throws Error with a Norwegian message that can be shown as it is. */
  onSave: (template: NewLegalTemplate) => Promise<void>;
};

/** A form for a legal template, new or saved. */
export function LegalTemplateForm({ initial, onSave }: LegalTemplateFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [text, setText] = useState(initial?.text ?? '');
  const [status, setStatus] = useState<SaveStatus>({ kind: 'idle' });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ kind: 'saving' });
    try {
      await onSave({ title: title.trim(), description: description.trim(), text: text.trim() });
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
        Lovverket «{title.trim()}» er lagret.{' '}
        <Link href={templatesSectionHref('lovverk')} scroll={false}>
          Se lovverket ditt
        </Link>
      </Alert>
    );
  }

  const isSaving = status.kind === 'saving';
  const canSave =
    !isSaving && title.trim() !== '' && description.trim() !== '' && text.trim() !== '';

  return (
    <form
      className={styles.form}
      onSubmit={handleSubmit}
      aria-label={initial ? 'Rediger lovverket' : 'Legg til lovverk'}
    >
      <TextField
        label="Navn"
        helperText="Loven eller regelen, for eksempel «Arbeidsmiljøloven § 9-3»."
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        required
        disabled={isSaving}
        slotProps={{ htmlInput: { maxLength: LIMITS.title } }}
      />
      <TextField
        label="Kort beskrivelse"
        helperText="Én setning om hva det gjelder. Vises på kortet."
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        required
        disabled={isSaving}
        slotProps={{ htmlInput: { maxLength: LIMITS.description } }}
      />
      <div className={styles.panel}>
        <TextField
          label="Hva intervjueren skal følge"
          helperText={
            // English translation: What the employer may not ask about or weigh, and what rights the
            // job seeker has. Write it in plain words. The interviewer follows this text, and uses it
            // if the job seeker asks about their rights.
            `Hva arbeidsgiveren ikke kan spørre om eller legge vekt på, og hvilke rettigheter ` +
            `jobbsøkeren har. Skriv det med enkle ord. Intervjueren følger teksten, og bruker den ` +
            `hvis jobbsøkeren spør om rettighetene sine. ${text.length}/${LIMITS.text} tegn.`
          }
          value={text}
          onChange={(event) => setText(event.target.value)}
          required
          multiline
          minRows={4}
          disabled={isSaving}
          slotProps={{ htmlInput: { maxLength: LIMITS.text } }}
        />
      </div>

      {status.kind === 'error' && (
        <Alert severity="error" className={styles.wide}>
          {status.message}
        </Alert>
      )}
      <div className={styles.actions}>
        <Button type="submit" variant="contained" disabled={!canSave}>
          {isSaving ? 'Lagrer …' : initial ? 'Lagre endringene' : 'Lagre lovverk'}
        </Button>
        <Button
          component={Link}
          href={templatesSectionHref('lovverk')}
          scroll={false}
          disabled={isSaving}
        >
          Avbryt
        </Button>
      </div>
    </form>
  );
}
