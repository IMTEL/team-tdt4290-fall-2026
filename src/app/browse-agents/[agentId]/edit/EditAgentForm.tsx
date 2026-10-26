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

import { AdvancedSettingsFields } from '@/components/agents/AdvancedSettingsFields';
import { AvatarPicker } from '@/components/agents/AvatarPicker';
import { LegalTemplateSelect } from '@/components/legalTemplates/LegalTemplateSelect';
import { useLanguageModels } from '@/components/agents/useLanguageModels';
import { type AdvancedSettings, advancedSettingsErrors } from '@/domain/advancedSettings';
import { MAX_NAME_LENGTH } from '@/domain/agentName';
import { hasAllAnswers } from '@/domain/agentTypes/registry';
import type {
  AgentTypeDefinition,
  AnswerSource,
  AnswerSources,
  Answers,
  SingleAnswerSource,
} from '@/domain/agentTypes/types';
import { describeLegalFrameworks, type LegalTemplate } from '@/domain/legalTemplate';

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
  kind: SingleAnswerSource['kind'];
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
  if (!source || source.kind === 'legal' || source.kind !== preset.kind) {
    return { optionId: '', note: null };
  }

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

/**
 * The legal templates an answer can be made from. Ticking them puts their text together in the
 * field, where the counsellor can still change it.
 */
export type LegalPreset = {
  /** The answer the templates fill in. */
  field: string;
  /** The built-in templates first, then the counsellor's own. */
  options: LegalTemplate[];
  /** False while the options are loading, so a source is not reported missing too early. */
  loaded: boolean;
};

/** What the legal checkboxes show: the ticked templates, and a note about the source. */
type LegalChoice = { ids: string[]; note: string | null };

/**
 * The legal templates the answer came from, if the agent remembers them and their text is still
 * in the field. If one has been changed or deleted since, nothing is ticked and the note says so,
 * the same way presetChoice does for one template or profile.
 */
export function legalChoice(
  preset: LegalPreset,
  answer: string,
  source: AnswerSource | undefined,
): LegalChoice {
  if (source?.kind !== 'legal') return { ids: [], note: null };

  const chosen = source.ids.flatMap((id) => preset.options.filter((option) => option.id === id));
  if (chosen.length === source.ids.length && describeLegalFrameworks(chosen) === answer) {
    return { ids: source.ids, note: null };
  }
  if (!preset.loaded) return { ids: [], note: null };
  if (chosen.length < source.ids.length) {
    return { ids: [], note: 'Teksten kom fra lovverk som ikke finnes lenger.' };
  }
  const titles = chosen.map(({ title }) => `«${title}»`).join(', ');
  return { ids: [], note: `Teksten kom fra ${titles}, som er endret siden.` };
}

function sameSource(a: AnswerSource | undefined, b: AnswerSource | undefined): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

type EditAgentFormProps = {
  agentId: string;
  initialName: string;
  definition: AgentTypeDefinition;
  initialAnswers: Answers;
  /** Where the saved answers came from. */
  initialSources?: AnswerSources;
  initialSettings: AdvancedSettings;
  /** The id of the agent's avatar. Null, the default, for an agent without one. */
  initialAvatar?: string | null;
  /** The form's name for screen readers. */
  label: string;
  submitLabel: string;
  /**
   * Saves the name, answers, sources and (only the changed) advanced settings and avatar, and
   * returns the id of the agent to go to afterwards. `settings` and `avatar` are undefined when
   * they were not changed. `avatar` is null when the default image was chosen.
   */
  onSave: (
    name: string,
    answers: Answers,
    sources: AnswerSources,
    settings?: AdvancedSettings,
    avatar?: string | null,
  ) => Promise<string>;
  /** True when saving is allowed without changes, as for a clone. */
  allowUnchanged?: boolean;
  presets?: AnswerPreset[];
  /** The legal templates the type's legal field can be made from. None for a type without one. */
  legalPreset?: LegalPreset;
};

/**
 * Change an agent's name, answers and advanced settings, for editing an agent or for saving a clone
 * of it. The fields come from the agent type, so the form works for every type, and a field added
 * to a type shows up here by itself.
 */
export function EditAgentForm({
  agentId,
  initialName,
  definition,
  initialAnswers,
  initialSources = {},
  initialSettings,
  initialAvatar = null,
  label,
  submitLabel,
  onSave,
  allowUnchanged = false,
  presets = [],
  legalPreset,
}: EditAgentFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [answers, setAnswers] = useState(initialAnswers);
  const [sources, setSources] = useState(initialSources);
  const [settings, setSettings] = useState(initialSettings);
  const [avatar, setAvatar] = useState(initialAvatar);
  const [status, setStatus] = useState<SaveStatus>({ kind: 'idle' });
  const languageModels = useLanguageModels(initialSettings.model);

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

  // Ticking none puts back the saved text as the counsellor's own, unless it came from legal
  // templates: then none means no lovverk.
  function chooseLegal(preset: LegalPreset, ids: string[]) {
    const chosen = ids.flatMap((id) => preset.options.filter((option) => option.id === id));
    const ownText =
      initialSources[preset.field]?.kind === 'legal' ? '' : (initialAnswers[preset.field] ?? '');
    setAnswers((current) => ({
      ...current,
      [preset.field]: chosen.length > 0 ? describeLegalFrameworks(chosen) : ownText,
    }));
    setSource(
      preset.field,
      chosen.length > 0 ? { kind: 'legal', ids: chosen.map(({ id }) => id) } : null,
    );
  }

  const legal =
    legalPreset &&
    legalChoice(legalPreset, answers[legalPreset.field] ?? '', sources[legalPreset.field]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ kind: 'saving' });
    try {
      // Only changed settings and a changed avatar are sent; otherwise the agent keeps the ones it
      // has.
      const savedId = await onSave(
        name.trim(),
        answers,
        sources,
        settingsChanges > 0 ? settings : undefined,
        avatar !== initialAvatar ? avatar : undefined,
      );
      router.push(`/browse-agents/${savedId}`);
    } catch (error) {
      // The form keeps what was typed, so nothing is lost and the counsellor can try again.
      // onSave only throws messages written for users.
      const message = error instanceof Error ? error.message : 'Noe gikk galt. Prøv igjen.';
      setStatus({ kind: 'error', message });
    }
  }

  const isSaving = status.kind === 'saving';
  const settingsChanges = (['model', 'temperature', 'customPrompt'] as const).filter(
    (key) => settings[key] !== initialSettings[key],
  ).length;
  // Unchanged settings are not sent, so settings saved by another client that our form would not
  // accept (three decimals, say) must not stop the counsellor from changing the name or answers.
  const settingsErrors =
    settingsChanges > 0 ? advancedSettingsErrors(settings, languageModels.models) : {};
  const isComplete =
    name.trim() !== '' &&
    hasAllAnswers(definition, answers) &&
    Object.keys(settingsErrors).length === 0;
  const changes =
    (name.trim() !== initialName ? 1 : 0) +
    definition.fields.filter(
      ({ key }) =>
        answers[key] !== initialAnswers[key] || !sameSource(sources[key], initialSources[key]),
    ).length +
    settingsChanges +
    (avatar !== initialAvatar ? 1 : 0);

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
        title="Avatar"
        description="Bildet agenten vises med i agentlisten og på agentens side."
      >
        <AvatarPicker value={avatar} onChange={setAvatar} disabled={isSaving} />
      </Section>

      <Section
        title="Konfigurasjon"
        description={
          settings.customPrompt === null
            ? // English translation: When you save, the system prompt is made again from these answers.
              'Når du lagrer, lages systemprompten på nytt fra disse svarene.'
            : // English translation: The system prompt is written by hand, so these answers do not change it.
              'Systemprompten er skrevet for hånd, så disse svarene endrer den ikke.'
        }
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
        {legalPreset && legal && (
          <Box sx={{ mb: 3 }}>
            <LegalTemplateSelect
              templates={legalPreset.options}
              value={legal.ids}
              onChange={(ids) => chooseLegal(legalPreset, ids)}
              disabled={isSaving}
              helperText={
                legal.note ??
                'Fyller inn Lovverk under, og erstatter teksten som står der. Du kan endre ' +
                  'teksten etterpå.'
              }
            />
          </Box>
        )}
        <Box
          sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' } }}
        >
          {definition.fields.map(({ key, label, optional }) => {
            // Measured on the saved answer, so the layout does not jump while typing.
            const isLong = (initialAnswers[key] ?? '').length > LONG_ANSWER;
            return (
              <TextField
                key={key}
                label={label}
                value={answers[key] ?? ''}
                onChange={(event) => typeAnswer(key, event.target.value)}
                required={!optional}
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

      <AdvancedSettingsFields
        value={settings}
        onChange={setSettings}
        builtPrompt={definition.buildPrompt(answers)}
        languageModels={languageModels}
        errors={settingsErrors}
        disabled={isSaving}
      />

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
