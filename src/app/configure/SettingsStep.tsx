'use client';

import type { ReactNode } from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { FieldHelp } from '@/components/ui/FieldHelp';
import helpStyles from '@/components/ui/FieldHelp.module.css';
import { DEFAULT_MODEL, DEFAULT_TEMPERATURE } from '@/domain/advancedSettings';
import type { AnswerEffect } from '@/domain/agentTypes/types';
import stepStyles from './StillingStep.module.css';
import { ChoiceSummary, WizardFrame, WizardNav } from './StillingStep';
import { FinishActions, type FinishOverview } from './FinishStep';
import type { TemplatePeek } from './templatePeeks';

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
  /** Opens the optional AI-innstillinger step. */
  onAiSettings?: () => void;
  /** The last step: finish in the main card, with the section list beside it. */
  expanded?: boolean;
  /** Closes the last step: AI-innstillinger if it was opened, otherwise Innstillinger. */
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
  openedAiSettings?: boolean;
  onSaveDraft?: () => void;
  peeks?: TemplatePeek[];
};

/** The settings step, in the same frame as stilling, intervjuer and jobbsøker. */
export function SettingsStep({
  value,
  onChange,
  intro,
  onBack,
  onNext,
  onAiSettings,
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
  openedAiSettings,
  onSaveDraft,
  peeks,
}: SettingsStepProps) {
  return (
    <WizardFrame
      current={expanded ? 5 : 3}
      onGoTo={onGoTo}
      reached={reached}
      openedAiSettings={openedAiSettings}
      peeks={peeks}
      more={
        expanded ? (
          <FinishActions
            intro={intro}
            onBack={onFinishBack}
            overview={overview}
            effects={effects}
            customPrompt={false}
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
        ) : undefined
      }
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
          help="Første intervju er kort og bli-kjent. Andre intervju er mer faglig og dyptgående."
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
          help="Hvor krevende spørsmålene skal være for jobbsøkeren."
          value={value.difficulty}
          options={DIFFICULTIES}
          onChange={(difficulty) =>
            onChange({ ...value, difficulty: difficulty as InterviewSettings['difficulty'] })
          }
        />
        <Pills
          required
          label="Antall spørsmål"
          help="Hvor mange spørsmål intervjueren skal stille i intervjuet."
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
            <div className={stepStyles.fieldWithHelp}>
              <TextField
                label="Spesifiser antall"
                value={value.questionCountDetail}
                onChange={(event) =>
                  onChange({ ...value, questionCountDetail: event.target.value })
                }
                helperText="Skriv hvor mange spørsmål, for eksempel 12."
                required
                fullWidth
              />
              <FieldHelp
                label="Spesifiser antall"
                description="Det nøyaktige antallet spørsmål når du velger 10 eller flere."
              />
            </div>
          )}
        </Pills>

        <div className={stepStyles.employer}>
          <div className={helpStyles.row}>
            <span className={stepStyles.suggestionLabel} id="follow-up-label">
              Oppfølgingsspørsmål
              <RequiredMark />
            </span>
            <FieldHelp
              label="Oppfølgingsspørsmål"
              description="Om intervjueren skal stille oppfølgingsspørsmål etter jobbsøkerens svar."
            />
          </div>
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

        <div className={stepStyles.fieldWithHelp}>
          <TextField
            label="Egne spørsmål"
            value={value.ownQuestions}
            onChange={(event) => onChange({ ...value, ownQuestions: event.target.value })}
            helperText="Spørsmål som må være med. Du kan hoppe over dette."
            multiline
            minRows={2}
            fullWidth
          />
          <FieldHelp
            label="Egne spørsmål"
            description="Spørsmål som må være med i intervjuet. Valgfritt."
          />
        </div>
        <div className={stepStyles.fieldWithHelp}>
          <TextField
            label="Tillegg"
            value={value.extra}
            onChange={(event) => onChange({ ...value, extra: event.target.value })}
            helperText="Noe mer du vil legge til. Du kan hoppe over dette."
            multiline
            minRows={2}
            fullWidth
          />
          <FieldHelp
            label="Tillegg"
            description="Noe mer intervjueren skal vite eller gjøre. Valgfritt."
          />
        </div>

        <ChoiceSummary lines={settingsChoiceLines(value)} />
        <WizardNav
          onBack={onBack}
          extraNext={
            onAiSettings ? { label: 'AI-innstillinger', onClick: onAiSettings } : undefined
          }
          nextSubmit
          nextDisabled={!settingsComplete(value)}
          onSaveDraft={onSaveDraft}
        />
      </form>
    </WizardFrame>
  );
}

function settingsChoiceLines(value: InterviewSettings): { label: string; value: string }[] {
  const count =
    value.questionCount === '10+' && value.questionCountDetail.trim()
      ? `${value.questionCount} (${value.questionCountDetail.trim()})`
      : (value.questionCount ?? '');
  return [
    {
      label: 'Intervjutype',
      value: value.interviewType ? capitalize(value.interviewType) : '',
    },
    {
      label: 'Vanskelighetsgrad',
      value: value.difficulty ? capitalize(value.difficulty) : '',
    },
    { label: 'Antall spørsmål', value: count },
    {
      label: 'Oppfølgingsspørsmål',
      value: value.followUp ? capitalize(value.followUp) : '',
    },
    { label: 'Egne spørsmål', value: value.ownQuestions.trim() },
    { label: 'Tillegg', value: value.extra.trim() },
  ];
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
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
  help,
  options,
  value,
  onChange,
  children,
  required = false,
}: {
  label: string;
  help: string;
  options: readonly { id: string; label: string }[];
  value: string | null;
  onChange: (id: string) => void;
  children?: ReactNode;
  required?: boolean;
}) {
  return (
    <div className={stepStyles.suggestions}>
      <div className={helpStyles.row}>
        <p className={stepStyles.suggestionLabel}>
          {label}
          {required && <RequiredMark />}
        </p>
        <FieldHelp label={label} description={help} />
      </div>
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
