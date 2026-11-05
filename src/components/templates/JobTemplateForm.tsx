'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { SECTOR_LABELS, type Sector } from '@/data/job-templates';
import { JOB_TEMPLATE_LIMITS as LIMITS, type NewJobTemplate } from '@/domain/workplaceTemplate';
import styles from '@/components/profiles/ProfileForm.module.css';

type JobTemplateFormProps = {
  /** The stillingsmal to edit. Leave it out to make a new one. */
  initial?: NewJobTemplate;
  /** The industries to choose from. A new one can be written too. */
  industries: string[];
  /** Saves the stillingsmal. Throws Error with a Norwegian message that can be shown as it is. */
  onSave: (template: NewJobTemplate) => Promise<void>;
  /** Where «Avbryt» goes. */
  cancelHref: string;
};

/** The tasks as the counsellor writes them, separated by commas. */
function parseTasks(text: string): string[] {
  return text
    .split(',')
    .map((task) => task.trim())
    .filter(Boolean);
}

/** A form for a stillingsmal, new or saved. */
export function JobTemplateForm({ initial, industries, onSave, cancelHref }: JobTemplateFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [industry, setIndustry] = useState(initial?.industry ?? '');
  const [sector, setSector] = useState<Sector | null>(initial?.sector ?? null);
  const [description, setDescription] = useState(initial?.description ?? '');
  const [tasks, setTasks] = useState(initial?.tasks.join(', ') ?? '');
  const [jobDescription, setJobDescription] = useState(initial?.jobDescription ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const taskList = parseTasks(tasks);
  const tasksError =
    taskList.length > LIMITS.tasks
      ? `Skriv høyst ${LIMITS.tasks} oppgaver.`
      : taskList.some((task) => task.length > LIMITS.task)
        ? `Hver oppgave kan ha høyst ${LIMITS.task} tegn.`
        : null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sector) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({
        title: title.trim(),
        industry: industry.trim(),
        sector,
        description: description.trim(),
        tasks: taskList,
        jobDescription: jobDescription.trim(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Noe gikk galt. Prøv igjen.');
      setSaving(false);
    }
  }

  const canSave =
    !saving &&
    title.trim() !== '' &&
    industry.trim() !== '' &&
    sector !== null &&
    description.trim() !== '' &&
    jobDescription.trim() !== '' &&
    !tasksError;

  return (
    <form
      className={styles.form}
      onSubmit={handleSubmit}
      aria-label={initial ? 'Rediger stillingsmalen' : 'Ny stillingsmal'}
    >
      <div className={styles.panel}>
        <TextField
          label="Stilling"
          helperText="En vanlig stillingstittel, for eksempel «Lagermedarbeider»."
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          disabled={saving}
          slotProps={{ htmlInput: { maxLength: LIMITS.title } }}
        />
        {/* A list to choose from, or a new industry written in. */}
        <Autocomplete
          freeSolo
          options={industries}
          inputValue={industry}
          onInputChange={(_event, value) => setIndustry(value)}
          disabled={saving}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Bransje"
              helperText="Velg en bransje, eller skriv en ny."
              required
              slotProps={{
                ...params.slotProps,
                htmlInput: { ...params.slotProps.htmlInput, maxLength: LIMITS.industry },
              }}
            />
          )}
        />
        <fieldset className={`${styles.fieldset} ${styles.wide}`}>
          <legend className={styles.legend}>Arbeidsgiver *</legend>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={sector}
            disabled={saving}
            aria-label="Arbeidsgiver"
            onChange={(_event, next: Sector | null) => {
              if (next) setSector(next);
            }}
          >
            <ToggleButton value="offentlig">{SECTOR_LABELS.offentlig}</ToggleButton>
            <ToggleButton value="privat">{SECTOR_LABELS.privat}</ToggleButton>
          </ToggleButtonGroup>
        </fieldset>
        <TextField
          className={styles.wide}
          label="Kort beskrivelse"
          helperText="Én setning om hvordan jobben er. Vises på kortet."
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          required
          disabled={saving}
          slotProps={{ htmlInput: { maxLength: LIMITS.description } }}
        />
        <TextField
          className={styles.wide}
          label="Typiske oppgaver (valgfritt)"
          helperText={
            tasksError ?? 'Skill dem med komma, for eksempel «Plukking, Truck, Varemottak».'
          }
          error={Boolean(tasksError)}
          value={tasks}
          onChange={(event) => setTasks(event.target.value)}
          disabled={saving}
        />
      </div>
      <div className={styles.panel}>
        <TextField
          label="Dette får intervjueren vite om stillingen"
          helperText={
            // English translation: What the job is like: the workplace, the tasks and what the
            // employer looks for. The interviewer asks about the job from this text.
            `Hvordan jobben er: arbeidsplassen, oppgavene og hva arbeidsgiveren ser etter. ` +
            `Intervjueren spør om stillingen ut fra denne teksten. ` +
            `${jobDescription.length}/${LIMITS.jobDescription} tegn.`
          }
          value={jobDescription}
          onChange={(event) => setJobDescription(event.target.value)}
          required
          multiline
          minRows={3}
          disabled={saving}
          className={styles.wide}
          slotProps={{ htmlInput: { maxLength: LIMITS.jobDescription } }}
        />
      </div>

      {error && (
        <Alert severity="error" className={styles.wide}>
          {error}
        </Alert>
      )}
      <div className={styles.actions}>
        <Button type="submit" variant="contained" disabled={!canSave}>
          {saving ? 'Lagrer …' : initial ? 'Lagre endringene' : 'Lagre stillingsmal'}
        </Button>
        <Button component={Link} href={cancelHref} disabled={saving}>
          Avbryt
        </Button>
      </div>
    </form>
  );
}
