'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';

import { templatesSectionHref } from '@/app/templates/sectionOpen';
import {
  builtInLegalParagraphs,
  inferSourceIds,
  legalParagraphPlaceholders,
} from '@/data/legal-templates';
import {
  composeLegalTemplateText,
  LEGAL_TEMPLATE_LIMITS as LIMITS,
  type NewLegalTemplate,
} from '@/domain/legalTemplate';
import { LegalParagraphPicker } from './LegalParagraphPicker';
import styles from './LegalTemplateForm.module.css';

type SaveStatus =
  { kind: 'idle' } | { kind: 'saving' } | { kind: 'saved' } | { kind: 'error'; message: string };

type LegalTemplateFormProps = {
  /** The template to edit. Leave it out to make a new one. */
  initial?: NewLegalTemplate;
  /** Saves the template. Throws Error with a Norwegian message that can be shown as it is. */
  onSave: (template: NewLegalTemplate) => Promise<void>;
};

function extraFrom(sourceIds: string[], initial?: NewLegalTemplate): string {
  if (!initial?.text) return '';
  let rest = initial.text;
  for (const paragraph of builtInLegalParagraphs.filter((item) => sourceIds.includes(item.id))) {
    rest = rest.replace(`${paragraph.title}:\n${paragraph.text}`, '');
  }
  return rest.replace(/\n{3,}/g, '\n\n').trim();
}

/** A form for a legal template, new or saved. */
export function LegalTemplateForm({ initial, onSave }: LegalTemplateFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [sourceIds, setSourceIds] = useState<string[]>(() => {
    if (!initial) return builtInLegalParagraphs.map((paragraph) => paragraph.id);
    if (initial.sourceIds?.length) return initial.sourceIds;
    return inferSourceIds(initial.text);
  });
  const [extra, setExtra] = useState(() => extraFrom(sourceIds, initial));
  const [status, setStatus] = useState<SaveStatus>({ kind: 'idle' });

  const selected = builtInLegalParagraphs.filter((paragraph) => sourceIds.includes(paragraph.id));
  const text = composeLegalTemplateText(selected, extra);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ kind: 'saving' });
    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        text,
        ...(sourceIds.length > 0 ? { sourceIds } : {}),
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
        Lovverket «{title.trim()}» er lagret.{' '}
        <Link href={templatesSectionHref('lovverk')} scroll={false}>
          Se lovverket ditt
        </Link>
      </Alert>
    );
  }

  const isSaving = status.kind === 'saving';
  const canSave =
    !isSaving &&
    title.trim() !== '' &&
    description.trim() !== '' &&
    text !== '' &&
    text.length <= LIMITS.text;

  return (
    <form
      className={styles.form}
      onSubmit={handleSubmit}
      aria-label={initial ? 'Rediger lovverket' : 'Legg til lovverk'}
    >
      <div className={styles.panel}>
        <div className={styles.identity}>
          <TextField
            size="small"
            label="Navn"
            helperText="Et navn du kjenner igjen, for eksempel «Uten helsespørsmål»."
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            disabled={isSaving}
            slotProps={{ htmlInput: { maxLength: LIMITS.title } }}
          />
          <TextField
            size="small"
            label="Kort beskrivelse"
            helperText="Én setning om hva det gjelder. Vises på kortet."
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            required
            disabled={isSaving}
            slotProps={{ htmlInput: { maxLength: LIMITS.description } }}
          />
        </div>

        <fieldset className={styles.laws} disabled={isSaving}>
          <legend className={styles.legend}>Lover og paragrafer</legend>
          <LegalParagraphPicker
            paragraphs={[...builtInLegalParagraphs, ...legalParagraphPlaceholders]}
            value={sourceIds}
            onChange={setSourceIds}
            disabled={isSaving}
          />
        </fieldset>

        <TextField
          size="small"
          label="Annet"
          helperText={
            `Valgfritt. En regel du skriver selv, i tillegg til lovene over. ` +
            `${text.length}/${LIMITS.text} tegn.`
          }
          value={extra}
          onChange={(event) => setExtra(event.target.value)}
          multiline
          minRows={2}
          disabled={isSaving}
          error={text.length > LIMITS.text}
          slotProps={{ htmlInput: { maxLength: LIMITS.text } }}
        />
      </div>

      {status.kind === 'error' && <Alert severity="error">{status.message}</Alert>}
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
