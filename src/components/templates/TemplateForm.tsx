'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';

import { TEMPLATE_LIMITS } from '@/data/templates';
import {
  getTemplateAgentType,
  listPlannedAgentTypes,
  listTemplateAgentTypes,
} from '@/domain/agentTypes/registry';
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
  /** The agent type a new template starts with, e.g. from the link on /configure. */
  defaultAgentType?: string | null;
  /** Saves the template. Throws Error with a Norwegian message that can be shown as it is. */
  onSave: (template: NewTemplate) => Promise<void>;
  /**
   * After a successful save. When set, the form does not show the success alert (e.g. the parent
   * redirects and shows a toast on the templates page).
   */
  onSaved?: () => void;
  /** Where Avbryt goes. The page you opened the form from, or /templates. */
  cancelHref?: string;
};

/**
 * A form for a template, new or saved, for one of the agent types templates can be made for.
 * Saved templates show up on /configure for that type. The labels and help come from the type.
 */
export function TemplateForm({
  initial,
  defaultAgentType,
  onSave,
  onSaved,
  cancelHref = '/configure',
}: TemplateFormProps) {
  const types = listTemplateAgentTypes();
  const [agentType, setAgentType] = useState(
    initial?.agentType ?? getTemplateAgentType(defaultAgentType)?.id ?? types[0]?.id ?? '',
  );
  const definition = getTemplateAgentType(agentType);
  const text = definition?.presets?.template?.text;
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
  const isComplete = Boolean(definition && title.trim() && description.trim() && persona.trim());

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ kind: 'saving' });
    try {
      await onSave({
        agentType,
        title: title.trim(),
        description: description.trim(),
        focus,
        persona: persona.trim(),
      });
      if (onSaved) {
        onSaved();
        return;
      }
      setStatus({ kind: 'saved' });
    } catch (error) {
      setStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Noe gikk galt. Prøv igjen.',
      });
    }
  }

  if (status.kind === 'saved') {
    const backLabel = cancelHref.startsWith('/templates')
      ? 'Se malene dine'
      : 'Bruk den til å sette opp en agent';
    return (
      <Alert severity="success">
        Malen «{title.trim()}» er lagret. <Link href={cancelHref}>{backLabel}</Link>
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
        select
        label="Type agent"
        helperText={
          initial
            ? 'Typen kan ikke endres etter at malen er lagret.'
            : 'Hva slags agent malen er for. Du finner den når du setter opp en slik agent.'
        }
        value={agentType}
        onChange={(event) => setAgentType(event.target.value)}
        required
        // Agents remember which template they came from, so a saved template keeps its type.
        disabled={isSaving || Boolean(initial)}
      >
        {types.map((type) => (
          <MenuItem key={type.id} value={type.id}>
            {type.label}
          </MenuItem>
        ))}
        {listPlannedAgentTypes().map((type) => (
          <MenuItem key={type.id} value={type.id} disabled>
            {type.label} (kommer snart)
          </MenuItem>
        ))}
      </TextField>
      <TextField
        label="Navn på malen"
        helperText={text?.titleHint}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        required
        disabled={isSaving}
        slotProps={{ htmlInput: { maxLength: TEMPLATE_LIMITS.title } }}
      />
      <TextField
        label="Kort beskrivelse"
        helperText={text?.descriptionHint}
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
        label={text?.textLabel ?? 'Beskrivelse'}
        helperText={text?.textHint}
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
        <Button component={Link} href={cancelHref} disabled={isSaving}>
          Avbryt
        </Button>
      </div>
    </form>
  );
}
