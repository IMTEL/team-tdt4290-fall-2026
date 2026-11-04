'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';

import {
  AGE_RANGES,
  EXPERIENCE_LEVELS,
  isAgeRange,
  isExperienceLevel,
  PRACTICE_AREAS,
  PROFILE_LIMITS as LIMITS,
  type NewJobSeekerProfile,
} from '@/domain/jobSeekerProfile';
import styles from './ProfileForm.module.css';

type SaveStatus =
  { kind: 'idle' } | { kind: 'saving' } | { kind: 'saved' } | { kind: 'error'; message: string };

/** Items typed as one comma-separated line, without empty ones. */
export function splitList(text: string): string[] {
  return text
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

const isPreset = (area: string) => (PRACTICE_AREAS as readonly string[]).includes(area);

type ProfileFormProps = {
  /** The profile to edit. Leave it out to make a new one. */
  initial?: NewJobSeekerProfile;
  /** Saves the profile. Throws Error with a Norwegian message that can be shown as it is. */
  onSave: (profile: NewJobSeekerProfile) => Promise<void>;
  /** Called after a successful save. When set, the form does not show the success alert. */
  onSaved?: () => void;
  /** Where Avbryt and the success link go. Defaults to Maler. */
  cancelHref?: string;
};

/** A form for an anonymous job seeker profile, new or saved. */
export function ProfileForm({
  initial,
  onSave,
  onSaved,
  cancelHref = '/templates',
}: ProfileFormProps) {
  const [label, setLabel] = useState(initial?.label ?? '');
  const [ageRange, setAgeRange] = useState<string>(initial?.ageRange ?? '');
  const [experienceLevel, setExperienceLevel] = useState<string>(initial?.experienceLevel ?? '');
  const [workExperience, setWorkExperience] = useState(initial?.workExperience ?? '');
  const [education, setEducation] = useState(initial?.education ?? '');
  const [languagesText, setLanguagesText] = useState(initial?.languages.join(', ') ?? '');
  const [presetAreas, setPresetAreas] = useState<string[]>(
    initial?.practiceAreas.filter(isPreset) ?? [],
  );
  const [otherAreasText, setOtherAreasText] = useState(
    initial?.practiceAreas.filter((area) => !isPreset(area)).join(', ') ?? '',
  );
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [status, setStatus] = useState<SaveStatus>({ kind: 'idle' });

  const languages = splitList(languagesText);
  const otherAreas = splitList(otherAreasText);
  const languagesError =
    languages.length > LIMITS.languages
      ? `Skriv høyst ${LIMITS.languages} språk.`
      : languages.some((item) => item.length > LIMITS.language)
        ? `Hvert språk kan ha høyst ${LIMITS.language} tegn.`
        : null;
  const otherAreasError = otherAreas.some((item) => item.length > LIMITS.practiceArea)
    ? `Hvert øvingsområde kan ha høyst ${LIMITS.practiceArea} tegn.`
    : null;

  function togglePreset(area: string, checked: boolean) {
    setPresetAreas((current) =>
      checked ? [...current, area] : current.filter((item) => item !== area),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ kind: 'saving' });
    try {
      await onSave({
        label: label.trim(),
        ageRange: isAgeRange(ageRange) ? ageRange : null,
        experienceLevel: isExperienceLevel(experienceLevel) ? experienceLevel : null,
        workExperience: workExperience.trim(),
        education: education.trim(),
        languages,
        // Keep the presets in the order they are shown.
        practiceAreas: [
          ...PRACTICE_AREAS.filter((area) => presetAreas.includes(area)),
          ...otherAreas,
        ],
        notes: notes.trim(),
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
    return (
      <Alert severity="success">
        Malen «{label.trim()}» er lagret. <Link href={cancelHref}>Se malene dine</Link>
      </Alert>
    );
  }

  const isSaving = status.kind === 'saving';
  const canSave =
    !isSaving && label.trim() !== '' && languagesError === null && otherAreasError === null;

  return (
    <form
      className={styles.form}
      onSubmit={handleSubmit}
      aria-label={initial ? 'Rediger malen' : 'Lag en mal'}
    >
      <TextField
        label="Navn på malen"
        helperText="Et navn bare du ser, for eksempel «Profil A». Ikke bruk jobbsøkerens ekte navn."
        value={label}
        onChange={(event) => setLabel(event.target.value)}
        required
        disabled={isSaving}
        className={styles.wide}
        slotProps={{ htmlInput: { maxLength: LIMITS.label } }}
      />

      <div className={styles.panel}>
        <TextField
          label="Notater"
          helperText="Bare for deg. Notatene sendes ikke til assistenten eller intervjueren."
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          multiline
          minRows={2}
          disabled={isSaving}
          slotProps={{ htmlInput: { maxLength: LIMITS.notes } }}
        />
      </div>

      <TextField
        select
        label="Aldersgruppe"
        value={ageRange}
        onChange={(event) => setAgeRange(event.target.value)}
        disabled={isSaving}
      >
        <MenuItem value="">Ikke oppgitt</MenuItem>
        {AGE_RANGES.map((range) => (
          <MenuItem key={range} value={range}>
            {range.replace('-', '–')} år
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        label="Arbeidserfaring"
        value={experienceLevel}
        onChange={(event) => setExperienceLevel(event.target.value)}
        disabled={isSaving}
      >
        <MenuItem value="">Ikke oppgitt</MenuItem>
        {Object.entries(EXPERIENCE_LEVELS).map(([level, levelLabel]) => (
          <MenuItem key={level} value={level}>
            {levelLabel}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        label="Hva slags erfaring?"
        helperText="Valgfritt. For eksempel «sommerjobb i butikk, frivillig i idrettslag»."
        value={workExperience}
        onChange={(event) => setWorkExperience(event.target.value)}
        disabled={isSaving}
        slotProps={{ htmlInput: { maxLength: LIMITS.workExperience } }}
      />
      <TextField
        label="Utdanning"
        helperText="Høyeste eller mest relevante. For eksempel «videregående, helsefag»."
        value={education}
        onChange={(event) => setEducation(event.target.value)}
        disabled={isSaving}
        slotProps={{ htmlInput: { maxLength: LIMITS.education } }}
      />
      <TextField
        label="Språk"
        helperText={
          languagesError ?? 'Skill med komma, gjerne med nivå. For eksempel «Norsk B1, Arabisk».'
        }
        error={languagesError !== null}
        value={languagesText}
        onChange={(event) => setLanguagesText(event.target.value)}
        disabled={isSaving}
        className={styles.wide}
      />

      <fieldset className={`${styles.fieldset} ${styles.panel}`} disabled={isSaving}>
        <legend className={styles.legend}>Hva vil jobbsøkeren øve på?</legend>
        <div className={styles.checkboxes}>
          {PRACTICE_AREAS.map((area) => (
            <FormControlLabel
              key={area}
              label={area}
              control={
                <Checkbox
                  checked={presetAreas.includes(area)}
                  onChange={(event) => togglePreset(area, event.target.checked)}
                />
              }
            />
          ))}
        </div>
        <TextField
          label="Annet"
          helperText={otherAreasError ?? 'Valgfritt. Skill med komma.'}
          error={otherAreasError !== null}
          value={otherAreasText}
          onChange={(event) => setOtherAreasText(event.target.value)}
          fullWidth
        />
      </fieldset>

      {status.kind === 'error' && <Alert severity="error">{status.message}</Alert>}
      <div className={styles.actions}>
        <Button type="submit" variant="contained" disabled={!canSave}>
          {isSaving ? 'Lagrer …' : initial ? 'Lagre endringene' : 'Lagre mal'}
        </Button>
        <Button component={Link} href={cancelHref} disabled={isSaving}>
          Avbryt
        </Button>
      </div>
    </form>
  );
}
