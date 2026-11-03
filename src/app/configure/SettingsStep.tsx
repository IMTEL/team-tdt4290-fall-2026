'use client';

import type { ReactNode } from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { AdvancedSettingsFields } from '@/components/agents/AdvancedSettingsFields';
import { useLanguageModels } from '@/components/agents/useLanguageModels';
import {
  type AdvancedSettings,
  advancedSettingsErrors,
  DEFAULT_MODEL,
  DEFAULT_TEMPERATURE,
} from '@/domain/advancedSettings';
import type { AnswerEffect } from '@/domain/agentTypes/types';
import stepStyles from './StillingStep.module.css';
import { WizardFrame } from './StillingStep';
import { FinishActions, configurationLines, type FinishOverview } from './FinishStep';

const INTERVIEW_TYPES = [
  { id: 'første intervju', label: 'Første intervju' },
  { id: 'andre intervju', label: 'Andre intervju' },
] as const;

const DIFFICULTIES = [
  { id: 'lett', label: 'Lett' },
  { id: 'middels', label: 'Middels' },
  { id: 'krevende', label: 'Krevende' },
] as const;

const QUESTION_COUNTS = ['3–4', '5–6', '7–8', '9–10', '10+'] as const;

export type InterviewSettings = {
  interviewType: (typeof INTERVIEW_TYPES)[number]['id'] | null;
  difficulty: (typeof DIFFICULTIES)[number]['id'] | null;
  questionCount: (typeof QUESTION_COUNTS)[number] | null;
  /** A number written in when «10+» is chosen, such as «12». */
  questionCountDetail: string;
  followUp: 'ja' | 'nei' | null;
  ownQuestions: string;
  extra: string;
  model: string;
  temperature: number;
  customPrompt: string | null;
};

export const EMPTY_INTERVIEW_SETTINGS: InterviewSettings = {
  interviewType: null,
  difficulty: null,
  questionCount: null,
  questionCountDetail: '',
  followUp: null,
  ownQuestions: '',
  extra: '',
  model: DEFAULT_MODEL,
  temperature: DEFAULT_TEMPERATURE,
  customPrompt: null,
};

type SettingsStepProps = {
  value: InterviewSettings;
  onChange: (value: InterviewSettings) => void;
  /** The agent-type line, same as on the interviewer and profile steps. */
  intro: ReactNode;
  onBack: () => void;
  onNext: () => void;
  /** The side card has grown into the last step. */
  expanded?: boolean;
  /** Closes the last step and shows the settings form again. */
  onFinishBack?: () => void;
  overview: FinishOverview;
  /** How the answers shape the interviewer, shown on the last step. */
  effects: AnswerEffect[];
  /** Null is the default image. */
  avatar: string | null;
  onAvatarChange: (avatar: string | null) => void;
  name: string;
  onNameChange: (name: string) => void;
  saving: boolean;
  saveError: string | null;
  onSave: () => void;
  /** Saves the agent, then publishes it to The Candidate. */
  onPublish: (publicName: string, publicDescription: string) => Promise<void>;
  onTest: () => void;
  /** Opens an earlier section from the list on the side. */
  onGoTo?: (index: number) => void;
  reached?: number;
  onSaveDraft?: () => void;
};

/** The settings step, in the same frame as stilling, intervjuer and jobbsøker. */
export function SettingsStep({
  value,
  onChange,
  intro,
  onBack,
  onNext,
  onGoTo,
  expanded = false,
  onFinishBack = () => {},
  overview,
  effects,
  avatar,
  onAvatarChange,
  name,
  onNameChange,
  saving,
  saveError,
  onSave,
  onPublish,
  onTest,
  reached,
  onSaveDraft,
}: SettingsStepProps) {
  const languageModels = useLanguageModels(value.model);
  const advanced: AdvancedSettings = {
    model: value.model,
    temperature: value.temperature,
    customPrompt: value.customPrompt,
  };

  return (
    <WizardFrame
      current={expanded ? 4 : 3}
      onGoTo={onGoTo}
      reached={reached}
      expanded={expanded}
      onSaveDraft={onSaveDraft}
      more={
        <FinishActions
          intro={intro}
          onBack={onFinishBack}
          effects={effects}
          customPrompt={Boolean(value.customPrompt?.trim())}
          avatar={avatar}
          onAvatarChange={onAvatarChange}
          name={name}
          onNameChange={onNameChange}
          saving={saving}
          error={saveError}
          onSave={onSave}
          onPublish={onPublish}
          onTest={onTest}
        />
      }
      details={expanded ? configurationLines(overview) : undefined}
    >
      <form
        className={stepStyles.form}
        onSubmit={(event) => {
          event.preventDefault();
          if (!settingsComplete(value)) return;
          onNext();
        }}
      >
        {intro}
        <h2 className={stepStyles.question}>Hvordan skal intervjuet være?</h2>
        <p className={stepStyles.hint}>Feltene med stjerne må fylles ut før du kan gå videre.</p>

        <Pills
          required
          label="Intervjutype"
          value={value.interviewType}
          options={INTERVIEW_TYPES}
          onChange={(interviewType) =>
            onChange({
              ...value,
              interviewType: interviewType as InterviewSettings['interviewType'],
            })
          }
        />
        <Pills
          required
          label="Vanskelighetsgrad"
          value={value.difficulty}
          options={DIFFICULTIES}
          onChange={(difficulty) =>
            onChange({ ...value, difficulty: difficulty as InterviewSettings['difficulty'] })
          }
        />
        <Pills
          required
          label="Antall spørsmål"
          value={value.questionCount}
          options={QUESTION_COUNTS.map((count) => ({ id: count, label: count }))}
          onChange={(questionCount) =>
            onChange({
              ...value,
              questionCount: questionCount as InterviewSettings['questionCount'],
            })
          }
        >
          {value.questionCount === '10+' && (
            <TextField
              label="Spesifiser antall"
              value={value.questionCountDetail}
              onChange={(event) => onChange({ ...value, questionCountDetail: event.target.value })}
              helperText="Skriv hvor mange spørsmål, for eksempel 12."
              required
              fullWidth
            />
          )}
        </Pills>

        <div className={stepStyles.employer}>
          <span className={stepStyles.suggestionLabel} id="follow-up-label">
            Oppfølgingsspørsmål
            <RequiredMark />
          </span>
          <ToggleButtonGroup
            exclusive
            size="small"
            className={stepStyles.sector}
            value={value.followUp}
            aria-labelledby="follow-up-label"
            onChange={(_event, followUp: InterviewSettings['followUp']) => {
              if (followUp) onChange({ ...value, followUp });
            }}
          >
            <ToggleButton value="ja">Ja</ToggleButton>
            <ToggleButton value="nei">Nei</ToggleButton>
          </ToggleButtonGroup>
        </div>

        <TextField
          label="Egne spørsmål"
          value={value.ownQuestions}
          onChange={(event) => onChange({ ...value, ownQuestions: event.target.value })}
          helperText="Spørsmål som må være med. Du kan hoppe over dette."
          multiline
          minRows={2}
          fullWidth
        />
        <TextField
          label="Tillegg"
          value={value.extra}
          onChange={(event) => onChange({ ...value, extra: event.target.value })}
          helperText="Noe mer du vil legge til. Du kan hoppe over dette."
          multiline
          minRows={2}
          fullWidth
        />

        <AdvancedSettingsFields
          value={advanced}
          onChange={(next) => onChange({ ...value, ...next })}
          builtPrompt=""
          languageModels={languageModels}
          errors={advancedSettingsErrors(advanced, languageModels.models)}
        />

        <div className={stepStyles.actions}>
          <div className={stepStyles.nav}>
            <Button type="button" onClick={onBack}>
              Tilbake
            </Button>
            <Button type="submit" variant="contained" disabled={!settingsComplete(value)}>
              Neste
            </Button>
          </div>
        </div>
      </form>
    </WizardFrame>
  );
}

function settingsComplete(value: InterviewSettings): boolean {
  const countReady =
    value.questionCount !== null &&
    (value.questionCount !== '10+' || value.questionCountDetail.trim() !== '');
  return (
    value.interviewType !== null &&
    value.difficulty !== null &&
    countReady &&
    value.followUp !== null
  );
}

function RequiredMark() {
  return (
    <span className={stepStyles.required} aria-hidden="true">
      {' '}
      *
    </span>
  );
}

function Pills({
  label,
  options,
  value,
  onChange,
  children,
  required = false,
}: {
  label: string;
  options: readonly { id: string; label: string }[];
  value: string | null;
  onChange: (id: string) => void;
  children?: ReactNode;
  required?: boolean;
}) {
  return (
    <div className={stepStyles.suggestions}>
      <p className={stepStyles.suggestionLabel}>
        {label}
        {required && <RequiredMark />}
      </p>
      <div className={stepStyles.pills}>
        {options.map((option) => {
          const selected = value === option.id;
          return (
            <Button
              key={option.id}
              type="button"
              size="small"
              variant={selected ? 'contained' : 'outlined'}
              aria-pressed={selected}
              onClick={() => onChange(option.id)}
            >
              {option.label}
            </Button>
          );
        })}
      </div>
      {children}
    </div>
  );
}
