'use client';

import type { ReactNode } from 'react';

import { AdvancedSettingsFields } from '@/components/agents/AdvancedSettingsFields';
import { useLanguageModels } from '@/components/agents/useLanguageModels';
import {
  type AdvancedSettings,
  advancedSettingsErrors,
  formatTemperature,
} from '@/domain/advancedSettings';
import { ChoiceSummary, WizardFrame, WizardNav } from './StillingStep';
import stepStyles from './StillingStep.module.css';
import type { InterviewSettings } from './SettingsStep';
import type { TemplatePeek } from './templatePeeks';

type AiSettingsStepProps = {
  value: InterviewSettings;
  onChange: (value: InterviewSettings) => void;
  intro: ReactNode;
  onBack: () => void;
  onNext: () => void;
  onGoTo?: (index: number) => void;
  reached?: number;
  openedAiSettings?: boolean;
  onSaveDraft?: () => void;
  peeks?: TemplatePeek[];
};

/** Optional language-model and temperature step. Defaults work, so it can be skipped. */
export function AiSettingsStep({
  value,
  onChange,
  intro,
  onBack,
  onNext,
  onGoTo,
  reached,
  openedAiSettings,
  onSaveDraft,
  peeks,
}: AiSettingsStepProps) {
  const languageModels = useLanguageModels(value.model);
  const advanced: AdvancedSettings = {
    model: value.model,
    temperature: value.temperature,
    customPrompt: null,
  };
  const errors = advancedSettingsErrors(advanced, languageModels.models);
  const canContinue = Object.keys(errors).length === 0;

  function apply(next: AdvancedSettings) {
    onChange({ ...value, ...next, customPrompt: null });
  }

  return (
    <WizardFrame
      current={4}
      onGoTo={onGoTo}
      reached={reached}
      openedAiSettings={openedAiSettings}
      peeks={peeks}
    >
      <div className={stepStyles.form}>
        {intro}
        <h2 className={stepStyles.question}>AI-innstillinger</h2>
        <p className={stepStyles.hint}>
          Du kan hoppe over dette steget. Standardverdiene fungerer godt for de fleste intervjuer.
        </p>
        <AdvancedSettingsFields
          value={advanced}
          onChange={apply}
          builtPrompt=""
          languageModels={languageModels}
          errors={errors}
          allowCustomPrompt={false}
          alwaysOpen
        />
        <ChoiceSummary
          lines={[
            { label: 'Språkmodell', value: value.model },
            { label: 'Temperatur', value: formatTemperature(value.temperature) },
          ]}
        />
        <WizardNav
          onBack={onBack}
          onNext={onNext}
          nextDisabled={!canContinue}
          onSaveDraft={onSaveDraft}
        />
      </div>
    </WizardFrame>
  );
}
