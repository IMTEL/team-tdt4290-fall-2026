'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { MAX_NAME_LENGTH } from '@/domain/agentName';
import type {
  AgentTypeDefinition,
  AnswerSource,
  AnswerSources,
  Answers,
} from '@/domain/agentTypes/types';

// Answers longer than this get a whole row and a taller field.
const LONG_ANSWER = 60;

type SaveStatus = { kind: 'idle' } | { kind: 'saving' } | { kind: 'error'; message: string };

/**
 * Ready-made text for one answer, such as the job seeker from a profile. Choosing an option puts
 * its text in the field, where the counsellor can still change it.
 */
export type AnswerPreset = {
  /** The answer the options fill in. */
  field: string;
  /** What the options are, stored as the answer's source when one is chosen. */
  kind: AnswerSource['kind'];
  label: string;
  options: { id: string; label: string; value: string }[];
  /** False while the options are loading, so a source is not reported missing too early. */
  loaded: boolean;
  /** Where the counsellor makes and changes the options. */
  manageHref: string;
  manageLabel: string;
};

/** What a preset's dropdown shows: the chosen option ('' for none), and a note about the source. */
type PresetChoice = { optionId: string; note: string | null };

/**
 * The option the answer came from, if the agent remembers one and its text is still in the field.
 * If the option has been changed or deleted since, the text is the counsellor's own, and the note
 * says where it came from.
 */
export function presetChoice(
  preset: AnswerPreset,
  answer: string,
  source: AnswerSource | undefined,
): PresetChoice {
  if (!source || source.kind !== preset.kind) return { optionId: '', note: null };

  const option = preset.options.find(({ id }) => id === source.id);
  if (option && option.value === answer) return { optionId: option.id, note: null };
  if (!preset.loaded) return { optionId: '', note: null };
  if (!option) {
    return {
      optionId: '',
      note: `Teksten kom fra en ${preset.label.toLowerCase()} som ikke finnes lenger.`,
    };
  }
  return { optionId: '', note: `Teksten kom fra «${option.label}», som er endret siden.` };
}

function sameSource(a: AnswerSource | undefined, b: AnswerSource | undefined): boolean {
  return a?.kind === b?.kind && a?.id === b?.id;
}

type EditAgentFormProps = {
  agentId: string;
  initialName: string;
  definition: AgentTypeDefinition;
  initialAnswers: Answers;
  /** Where the saved answers came from. */
  initialSources?: AnswerSources;
  /** The form's name for screen readers. */
  label: string;
  submitLabel: string;
  /** Saves the name, answers and sources, and returns the id of the agent to go to afterwards. */
  onSave: (name: string, answers: Answers, sources: AnswerSources) => Promise<string>;
  /** True when saving is allowed without changes, as for a clone. */
  allowUnchanged?: boolean;
  presets?: AnswerPreset[];
};

/**
 * Change an agent's name and answers, for editing an agent or for saving a clone of it. The fields
 * come from the agent type, so the form works for every type, and a field added to a type shows up
 * here by itself.
 */
export function EditAgentForm({
  agentId,
  initialName,
  definition,
  initialAnswers,
  initialSources = {},
  label,
  submitLabel,
  onSave,
  allowUnchanged = false,
  presets = [],
}: EditAgentFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [answers, setAnswers] = useState(initialAnswers);
  const [sources, setSources] = useState(initialSources);
  const [status, setStatus] = useState<SaveStatus>({ kind: 'idle' });

  function setSource(key: string, source: AnswerSource | null) {
    setSources((current) => {
      const next = { ...current };
      if (source) next[key] = source;
      else delete next[key];
      return next;
    });
  }

  // Text the counsellor types is their own, so it no longer comes from a template or profile.
  function typeAnswer(key: string, value: string) {
    setAnswers((current) => ({ ...current, [key]: value }));
    setSource(key, null);
  }

  // "Egen tekst" puts the saved text back, as the counsellor's own.
  function choosePreset(preset: AnswerPreset, optionId: string) {
    const option = preset.options.find(({ id }) => id === optionId);
    setAnswers((current) => ({
      ...current,
      [preset.field]: option ? option.value : (initialAnswers[preset.field] ?? ''),
    }));
    setSource(preset.field, option ? { kind: preset.kind, id: option.id } : null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ kind: 'saving' });
    try {
      const savedId = await onSave(name.trim(), answers, sources);
      router.push(`/browse-agents/${savedId}`);
    } catch (error) {
      // The form keeps what was typed, so nothing is lost and the counsellor can try again.
      // onSave only throws messages written for users.
      const message = error instanceof Error ? error.message : 'Noe gikk galt. Prøv igjen.';
      setStatus({ kind: 'error', message });
    }
  }

  const isSaving = status.kind === 'saving';
  const isComplete =
    name.trim() !== '' && definition.fields.every(({ key }) => answers[key]?.trim());
  const changes =
    (name.trim() !== initialName ? 1 : 0) +
    definition.fields.filter(
      ({ key }) =>
        answers[key] !== initialAnswers[key] || !sameSource(sources[key], initialSources[key]),
    ).length;

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      aria-label={label}
      sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}
    >
      <Section title="Navn" description="Navnet agenten vises med i agentlisten.">
        <TextField
          label="Navn"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          fullWidth
          disabled={isSaving}
          helperText={`${name.length}/${MAX_NAME_LENGTH} tegn`}
          slotProps={{ htmlInput: { maxLength: MAX_NAME_LENGTH } }}
        />
      </Section>

      <Section
        title="Konfigurasjon"
        description="Når du lagrer, lages systemprompten på nytt fra disse svarene."
      >
        {presets.length > 0 && (
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              mb: 3,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
            }}
          >
            {presets.map((preset) => {
              const choice = presetChoice(
                preset,
                answers[preset.field] ?? '',
                sources[preset.field],
              );
              return (
                <Box key={preset.field}>
                  <TextField
                    select
                    label={preset.label}
                    value={choice.optionId}
                    onChange={(event) => choosePreset(preset, event.target.value)}
                    fullWidth
                    disabled={isSaving}
                    helperText={
                      choice.note ?? 'Fyller inn feltet under. Du kan endre teksten etterpå.'
                    }
                    // Shows "Egen tekst" instead of an empty field when no option matches.
                    slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
                  >
                    <MenuItem value="">Egen tekst</MenuItem>
                    {preset.options.map((option) => (
                      <MenuItem key={option.id} value={option.id}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                  <Button component={Link} href={preset.manageHref} size="small" sx={{ mt: 0.5 }}>
                    {preset.manageLabel}
                  </Button>
                </Box>
              );
            })}
          </Box>
        )}
        <Box
          sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' } }}
        >
          {definition.fields.map(({ key, label }) => {
            // Measured on the saved answer, so the layout does not jump while typing.
            const isLong = (initialAnswers[key] ?? '').length > LONG_ANSWER;
            return (
              <TextField
                key={key}
                label={label}
                value={answers[key] ?? ''}
                onChange={(event) => typeAnswer(key, event.target.value)}
                required
                multiline
                minRows={isLong ? 3 : 1}
                fullWidth
                disabled={isSaving}
                sx={{ gridColumn: isLong ? '1 / -1' : undefined }}
              />
            );
          })}
        </Box>
      </Section>

      {status.kind === 'error' && <Alert severity="error">{status.message}</Alert>}

      {/* Stays at the bottom of the screen while scrolling, so saving is always one click away. */}
      <Paper
        variant="outlined"
        sx={{
          position: 'sticky',
          bottom: 16,
          zIndex: 2,
          boxShadow: 4,
          p: 2,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          {changes === 0
            ? 'Ingen endringer ennå'
            : `${changes} ${changes === 1 ? 'endring' : 'endringer'} som ikke er lagret`}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button component={Link} href={`/browse-agents/${agentId}`} disabled={isSaving}>
            Avbryt
          </Button>
          <Button
            type="submit"
            variant="contained"
            startIcon={<SaveOutlinedIcon />}
            disabled={isSaving || !isComplete || (changes === 0 && !allowUnchanged)}
          >
            {isSaving ? 'Lagrer …' : submitLabel}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}

/** A card with a heading and a short explanation, around a part of the form. */
function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Typography variant="h6" component="h2">
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2.5 }}>
        {description}
      </Typography>
      {children}
    </Paper>
  );
}
