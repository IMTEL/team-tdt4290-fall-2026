'use client';

import type { ReactNode } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';

import { AnswerEffects } from '@/components/agents/AnswerEffects';
import { AvatarPicker } from '@/components/agents/AvatarPicker';
import { formatTemperature } from '@/domain/advancedSettings';
import { MAX_NAME_LENGTH } from '@/domain/agentName';
import type { AnswerEffect } from '@/domain/agentTypes/types';
import { practiceChoiceLabel } from '@/domain/jobSeekerProfile';
import { SECTOR_LABELS, type IndustryTemplate } from '@/data/industry-templates';
import stepStyles from './StillingStep.module.css';
import type { Employer, Workplace } from './StillingStep';
import { NO_TEMPLATE } from './StillingStep';
import type { InterviewSettings } from './SettingsStep';

export type FinishOverview = {
  workplace: Workplace;
  jobTemplates: IndustryTemplate[];
  interviewerTitle: string | null;
  profileLabel: string | null;
  /** The chosen legal templates' titles, in the order they were chosen. */
  legalTitles: string[];
  /** Practice area ids chosen for this agent. */
  practiceAreas: string[];
  settings: InterviewSettings;
};

/** The controls that appear under the section card when it opens into the last step. */

const NONE = 'Ikke valgt';

function text(value: string): string {
  const trimmed = value.trim();
  return trimmed === '' ? NONE : trimmed;
}

function sector(value: Employer | null): string {
  if (value === 'ikke-oppgitt') return 'Ikke oppgitt';
  if (value === 'offentlig' || value === 'privat') return SECTOR_LABELS[value];
  return NONE;
}

function questionCount(settings: InterviewSettings): string {
  if (!settings.questionCount) return NONE;
  const detail = settings.questionCountDetail.trim();
  if (settings.questionCount === '10+' && detail) return `${settings.questionCount} (${detail})`;
  return settings.questionCount;
}

/** One line per section, in the same order as the section list. Fullføre has none. */
export function configurationLines(overview: FinishOverview): { label: string; value: string }[][] {
  const jobTemplate =
    overview.workplace.templateId === NO_TEMPLATE
      ? 'Ingen mal'
      : (overview.jobTemplates.find((item) => item.id === overview.workplace.templateId)?.title ??
        '');
  const { settings } = overview;
  return [
    [
      { label: 'Stilling', value: text(overview.workplace.jobTitle) },
      { label: 'Stillingsmal', value: text(jobTemplate) },
      {
        label: 'Bransje',
        value:
          overview.workplace.industry === NO_TEMPLATE
            ? 'Ingen bransje'
            : text(overview.workplace.industry),
      },
      { label: 'Arbeidsgiver', value: sector(overview.workplace.sector) },
      { label: 'Bedrift', value: text(overview.workplace.company) },
    ],
    [
      { label: 'Mal', value: overview.interviewerTitle ?? 'Ingen mal' },
      {
        label: 'Lovverk',
        value: overview.legalTitles.length > 0 ? overview.legalTitles.join(', ') : NONE,
      },
    ],
    [
      { label: 'Jobbsøkermal', value: overview.profileLabel ?? 'Ingen mal' },
      {
        label: 'Øve på',
        value:
          overview.practiceAreas.length > 0
            ? overview.practiceAreas.map(practiceChoiceLabel).join(', ')
            : NONE,
      },
    ],
    [
      {
        label: 'Intervjutype',
        value: settings.interviewType ? capitalize(settings.interviewType) : NONE,
      },
      {
        label: 'Vanskelighetsgrad',
        value: settings.difficulty ? capitalize(settings.difficulty) : NONE,
      },
      { label: 'Antall spørsmål', value: questionCount(settings) },
      {
        label: 'Oppfølgingsspørsmål',
        value: settings.followUp ? capitalize(settings.followUp) : NONE,
      },
      { label: 'Egne spørsmål', value: text(settings.ownQuestions) },
      { label: 'Tillegg', value: text(settings.extra) },
      { label: 'Språkmodell', value: settings.model },
      { label: 'Temperatur', value: formatTemperature(settings.temperature) },
    ],
    [],
  ];
}

/** The controls that appear under the section card when it opens into the last step. */
export function FinishActions({
  intro,
  onBack,
  effects,
  customPrompt,
  avatar,
  onAvatarChange,
  name,
  onNameChange,
  saving,
  error,
  onSave,
  onTest,
}: {
  intro: ReactNode;
  onBack: () => void;
  /** How the answers shape the interviewer. */
  effects: AnswerEffect[];
  /** The counsellor wrote the system prompt by hand, so the answers change nothing. */
  customPrompt: boolean;
  /** Null is the default image, which starts out chosen. */
  avatar: string | null;
  onAvatarChange: (avatar: string | null) => void;
  name: string;
  onNameChange: (name: string) => void;
  saving: boolean;
  error: string | null;
  onSave: () => void;
  onTest: () => void;
}) {
  const canSave = name.trim() !== '' && !saving;

  return (
    <div className={stepStyles.finishActions}>
      {intro}
      <h2 className={stepStyles.question}>Fullføre</h2>
      <p className={stepStyles.hint}>Trykk på et steg over for å endre det som står der.</p>
      {(effects.length > 0 || customPrompt) && (
        <section aria-labelledby="effects-heading" className={stepStyles.effects}>
          {/* English translation: How your answers shape the agent */}
          <h3 id="effects-heading" className={stepStyles.effectsHeading}>
            Slik former svarene dine agenten
          </h3>
          <AnswerEffects effects={effects} customPrompt={customPrompt} />
        </section>
      )}
      <div className={stepStyles.avatars}>
        <p className={stepStyles.avatarLabel}>Velg en avatar for intervjueren</p>
        <AvatarPicker value={avatar} onChange={onAvatarChange} disabled={saving} />
      </div>
      <TextField
        label="Navn på agenten"
        value={name}
        onChange={(event) => onNameChange(event.target.value)}
        required
        fullWidth
        disabled={saving}
        helperText={`${name.length}/${MAX_NAME_LENGTH} tegn`}
        slotProps={{ htmlInput: { maxLength: MAX_NAME_LENGTH } }}
      />
      {error && <Alert severity="error">{error}</Alert>}
      <div className={stepStyles.finishButtons}>
        <Button type="button" variant="contained" onClick={onSave} disabled={!canSave}>
          {saving ? 'Lagrer …' : 'Publiser'}
        </Button>
        <Button type="button" variant="outlined" onClick={onSave} disabled={!canSave}>
          {saving ? 'Lagrer …' : 'Lagre som utkast'}
        </Button>
        <Button type="button" variant="outlined" onClick={onTest} disabled={!canSave}>
          {saving ? 'Lagrer …' : 'Test agenten'}
        </Button>
        <div className={stepStyles.back}>
          <Button type="button" onClick={onBack} disabled={saving}>
            Gå tilbake
          </Button>
        </div>
      </div>
    </div>
  );
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
