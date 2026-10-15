'use client';

import { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';

import { AgentTypePicker } from '@/components/agents/AgentTypePicker';
import { fetchProfiles } from '@/components/profiles/api';
import { ProfileSelect } from '@/components/profiles/ProfileSelect';
import { IndustryPicker } from '@/components/templates/IndustryPicker';
import { IndustryPreview } from '@/components/templates/IndustryPreview';
import { TemplatePicker } from '@/components/templates/TemplatePicker';
import { industryTemplates, type IndustryTemplate } from '@/data/industry-templates';
import { builtInTemplates, type AgentTemplate } from '@/data/templates';
import { listAccessibleAgentTypes, listPlannedAgentTypes } from '@/domain/agentTypes/registry';
import type { AgentTypeDefinition } from '@/domain/agentTypes/types';
import type { JobSeekerProfile } from '@/domain/jobSeekerProfile';
import { fetchSavedTemplates } from './api';
import { ConfigurationChat } from './ConfigurationChat';
import styles from './page.module.css';

// undefined: the counsellor hasn't chosen yet. null: they chose to continue without one.
type Choice<T> = T | null | undefined;

/** Shows where the counsellor is, so they know what comes before the chat. */
function Steps({ steps, active }: { steps: string[]; active: number }) {
  return (
    <Stepper activeStep={active} alternativeLabel className={styles.steps}>
      {steps.map((label, index) => (
        <Step key={label} aria-current={index === active ? 'step' : undefined}>
          <StepLabel>{label}</StepLabel>
        </Step>
      ))}
    </Stepper>
  );
}

/**
 * First the counsellor picks the type of agent. Then, for each kind of preset the type has, what
 * fills it in: a job seeker profile and an interviewer template in one step, then an industry
 * template in the next. All are optional. The built-in interviewer templates come first, then the
 * ones the counsellor has saved. Then the chat starts. Everything type-specific comes from the
 * type's definition, so a new type needs no change here.
 */
export function ConfigureAgent() {
  const [definition, setDefinition] = useState<AgentTypeDefinition | undefined>(undefined);
  const [choice, setChoice] = useState<Choice<AgentTemplate>>(undefined);
  const [industry, setIndustry] = useState<Choice<IndustryTemplate>>(undefined);
  const [saved, setSaved] = useState<AgentTemplate[]>([]);
  const [profiles, setProfiles] = useState<JobSeekerProfile[]>([]);
  const [profileId, setProfileId] = useState('');
  // For a type with a profile but no template, where no template card moves the counsellor on.
  const [presetsDone, setPresetsDone] = useState(false);

  const presets = definition?.presets ?? {};
  const usesTemplates = Boolean(presets.template);
  const agentType = definition?.id;
  const usesProfiles = Boolean(presets.jobSeekerProfile);
  const usesIndustries = Boolean(presets.industryTemplate);

  useEffect(() => {
    if (!agentType || (!usesTemplates && !usesProfiles)) return;
    const controller = new AbortController();
    // Without the saved templates or profiles, the counsellor can still go on without them.
    const logError = (error: unknown) => {
      if (!controller.signal.aborted) console.error(error);
    };
    if (usesTemplates) {
      fetchSavedTemplates(agentType, controller.signal).then(setSaved).catch(logError);
    }
    if (usesProfiles) fetchProfiles(controller.signal).then(setProfiles).catch(logError);
    return () => controller.abort();
  }, [agentType, usesTemplates, usesProfiles]);

  function chooseType(next: AgentTypeDefinition | undefined) {
    setDefinition(next);
    setChoice(undefined);
    setIndustry(undefined);
    setProfileId('');
    setPresetsDone(false);
  }

  if (!definition) {
    return (
      <AgentTypePicker
        types={listAccessibleAgentTypes()}
        planned={listPlannedAgentTypes()}
        onSelect={chooseType}
      />
    );
  }

  const fieldLabel = (key: string | undefined) =>
    definition.fields.find((field) => field.key === key)?.label ?? '';

  // The steps this type has, e.g. "Velg intervjuer og profil", then "Velg bransje".
  const usesPresetStep = usesTemplates || usesProfiles;
  const presetStep = `Velg ${[
    usesTemplates && fieldLabel(presets.template?.field).toLowerCase(),
    usesProfiles && 'profil',
  ]
    .filter(Boolean)
    .join(' og ')}`;
  const steps = [
    'Velg agenttype',
    ...(usesPresetStep ? [presetStep] : []),
    ...(usesIndustries ? ['Velg bransje'] : []),
    'Svar på spørsmålene',
  ];

  const chosenType = (
    <div className={styles.chosen}>
      <p>
        Agenttype: <strong>{definition.label}</strong>
      </p>
      <Button variant="outlined" size="small" onClick={() => chooseType(undefined)}>
        Bytt agenttype
      </Button>
    </div>
  );

  const chosenIndustry = (
    <div className={styles.chosen}>
      <p>
        {fieldLabel(presets.industryTemplate?.job)}:{' '}
        <strong>{industry ? industry.title : 'Ingen bransjemal valgt'}</strong>
      </p>
      <Button variant="contained" size="small" onClick={() => setIndustry(undefined)}>
        {industry ? 'Bytt bransjemal' : 'Velg en bransjemal'}
      </Button>
    </div>
  );

  const profile = (usesProfiles && profiles.find((item) => item.id === profileId)) || null;
  const template = usesTemplates ? (choice ?? null) : null;
  const choosingPresets = usesTemplates ? choice === undefined : usesProfiles && !presetsDone;

  if (choosingPresets) {
    return (
      <>
        <Steps steps={steps} active={1} />
        {chosenType}
        {/* Kept when the counsellor goes back to change the interviewer. */}
        {usesIndustries && industry !== undefined && chosenIndustry}
        {usesProfiles && (
          <ProfileSelect profiles={profiles} value={profileId} onChange={setProfileId} />
        )}
        {usesTemplates ? (
          <TemplatePicker
            templates={builtInTemplates(definition.id)}
            savedTemplates={saved}
            agentType={definition.id}
            lead={presets.template?.text.pickerLead}
            onSelect={setChoice}
            onDeleted={(id) => setSaved((current) => current.filter((item) => item.id !== id))}
          />
        ) : (
          <Button variant="contained" onClick={() => setPresetsDone(true)}>
            Fortsett
          </Button>
        )}
        {usesIndustries && industry === undefined && (
          <IndustryPreview templates={industryTemplates} />
        )}
      </>
    );
  }

  // Shown above the industry picker and the chat, so the counsellor can go back and change it.
  const chosenPresets = usesPresetStep && (
    <div className={styles.chosen}>
      <p>
        {usesTemplates && (
          <>
            {fieldLabel(presets.template?.field)}:{' '}
            <strong>{template ? template.title : 'Ingen mal valgt'}</strong>
          </>
        )}
        {usesTemplates && usesProfiles && <br />}
        {usesProfiles && (
          <>
            {fieldLabel(presets.jobSeekerProfile)}:{' '}
            <strong>{profile ? profile.label : 'Ingen profil valgt'}</strong>
          </>
        )}
      </p>
      {/* Changing the choices starts the conversation over, since the chat was set up for them. */}
      <Button
        variant="contained"
        size="small"
        onClick={() => {
          setChoice(undefined);
          setPresetsDone(false);
        }}
      >
        {usesTemplates && usesProfiles
          ? 'Bytt mal eller profil'
          : usesTemplates
            ? 'Bytt mal'
            : 'Bytt profil'}
      </Button>
    </div>
  );

  if (usesIndustries && industry === undefined) {
    return (
      <>
        <Steps steps={steps} active={steps.length - 2} />
        {chosenType}
        {chosenPresets}
        <IndustryPicker templates={industryTemplates} onSelect={setIndustry} />
      </>
    );
  }

  const chosenIndustryTemplate = usesIndustries ? (industry ?? null) : null;

  return (
    <>
      <Steps steps={steps} active={steps.length - 1} />
      {chosenType}
      {chosenPresets}
      {usesIndustries && chosenIndustry}
      <ConfigurationChat
        key={[definition.id, template?.id, profile?.id, chosenIndustryTemplate?.id].join(':')}
        definition={definition}
        template={template}
        profile={profile}
        industry={chosenIndustryTemplate}
      />
    </>
  );
}
