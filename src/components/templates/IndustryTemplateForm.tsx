'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';

import {
  INDUSTRY_TEMPLATE_LIMITS as LIMITS,
  industryNameTaken,
  type NewIndustryTemplate,
} from '@/domain/workplaceTemplate';
import styles from '@/components/profiles/ProfileForm.module.css';

type IndustryTemplateFormProps = {
  /** The bransjemal to edit. Leave it out to make a new one. */
  initial?: NewIndustryTemplate;
  /** The names of the other industries. Two industries can't have the same name. */
  takenNames: string[];
  /** Saves the bransjemal. Throws Error with a Norwegian message that can be shown as it is. */
  onSave: (template: NewIndustryTemplate) => Promise<void>;
  /** Where «Avbryt» goes. */
  cancelHref: string;
};

/** A form for a bransjemal, new or saved. */
export function IndustryTemplateForm({
  initial,
  takenNames,
  onSave,
  cancelHref,
}: IndustryTemplateFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const taken = industryNameTaken(name, takenNames);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave({ name: name.trim(), description: description.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Noe gikk galt. Prøv igjen.');
      setSaving(false);
    }
  }

  const canSave = !saving && !taken && name.trim() !== '' && description.trim() !== '';

  return (
    <form
      className={styles.form}
      onSubmit={handleSubmit}
      aria-label={initial ? 'Rediger bransjemalen' : 'Ny bransjemal'}
    >
      <TextField
        label="Bransje"
        helperText={
          taken ? 'Det finnes allerede en bransje med dette navnet.' : 'For eksempel «Logistikk».'
        }
        error={taken}
        value={name}
        onChange={(event) => setName(event.target.value)}
        required
        disabled={saving}
        slotProps={{ htmlInput: { maxLength: LIMITS.name } }}
      />
      <TextField
        label="Kort beskrivelse"
        helperText="Én setning om bransjen. Vises på kortet."
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        required
        disabled={saving}
        slotProps={{ htmlInput: { maxLength: LIMITS.description } }}
      />

      {error && <Alert severity="error">{error}</Alert>}
      <div className={styles.actions}>
        <Button type="submit" variant="contained" disabled={!canSave}>
          {saving ? 'Lagrer …' : initial ? 'Lagre endringene' : 'Lagre bransjemal'}
        </Button>
        <Button component={Link} href={cancelHref} disabled={saving}>
          Avbryt
        </Button>
      </div>
    </form>
  );
}
