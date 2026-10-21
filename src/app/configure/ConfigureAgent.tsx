'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import {
  getAgentType,
  listAccessibleAgentTypes,
  listPlannedAgentTypes,
} from '@/domain/agentTypes/registry';
import type { AdvancedSettings } from '@/domain/advancedSettings';
import type { AgentTypeDefinition } from '@/domain/agentTypes/types';
import {
  isPracticeChoice,
  parseOtherPractice,
  PRACTICE_CHOICES,
  type JobSeekerProfile,
} from '@/domain/jobSeekerProfile';
import { updateAgent } from '../browse-agents/api';
import { fetchSavedTemplates, saveConfiguredAgent } from './api';
import { ConfigurationChat } from './ConfigurationChat';
import { JobSeekerStep } from './JobSeekerStep';
import { EMPTY_INTERVIEW_SETTINGS, SettingsStep, type InterviewSettings } from './SettingsStep';
import { StillingStep, WizardFrame, type Workplace } from './StillingStep';
import { suggestedAgentName, wizardConfiguration } from './wizardConfiguration';
import styles from './page.module.css';
import stepStyles from './StillingStep.module.css';

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
export function ConfigureAgent({
  initialTypeId = null,
  initialStep = null,
}: {
  initialTypeId?: string | null;
  initialStep?: string | null;
}) {
  const [definition, setDefinition] = useState<AgentTypeDefinition | undefined>(() =>
    initialTypeId ? getAgentType(initialTypeId) : undefined,
  );
  const [choice, setChoice] = useState<Choice<AgentTemplate>>(undefined);
  const [industry, setIndustry] = useState<Choice<IndustryTemplate>>(undefined);
  const [saved, setSaved] = useState<AgentTemplate[]>([]);
  const [profiles, setProfiles] = useState<JobSeekerProfile[]>([]);
  const [profilesLoaded, setProfilesLoaded] = useState(false);
  const [profileId, setProfileId] = useState('');
  const [practiceAreas, setPracticeAreas] = useState<string[]>([]);
  const [otherOpen, setOtherOpen] = useState(false);
  const [otherPractice, setOtherPractice] = useState('');
  const [settings, setSettings] = useState<InterviewSettings>(EMPTY_INTERVIEW_SETTINGS);
  // Null is the default image, chosen until the counsellor picks another.
  const [avatar, setAvatar] = useState<string | null>(null);
  const [nameEdited, setNameEdited] = useState(false);
  const [agentName, setAgentName] = useState('');
  const [savedAgent, setSavedAgent] = useState<{ id: string; name: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const savingLock = useRef(false);
  const router = useRouter();
  // For a type with a profile but no template, where no template card moves the counsellor on.
  const [presetsDone, setPresetsDone] = useState(false);
  // Which interviewer screen is open. 0 stilling, 1 intervjuer, 2 jobbsøker, 3 innstillinger, 4 fullføre.
  const [wizardStep, setWizardStep] = useState(
    initialTypeId === 'interviewer' && initialStep === 'intervjuer' ? 1 : 0,
  );
  const [furthestStep, setFurthestStep] = useState(
    initialTypeId === 'interviewer' && initialStep === 'intervjuer' ? 1 : 0,
  );
  const [workplace, setWorkplace] = useState<Workplace>({
    jobTitle: '',
    templateId: null,
    industry: '',
    sector: null,
    company: '',
  });

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
    if (usesProfiles) {
      fetchProfiles(controller.signal)
        .then((list) => {
          if (controller.signal.aborted) return;
          setProfiles(list);
          setProfilesLoaded(true);
        })
        .catch((error: unknown) => {
          logError(error);
          if (!controller.signal.aborted) setProfilesLoaded(true);
        });
    }
    return () => controller.abort();
  }, [agentType, usesTemplates, usesProfiles]);

  function chooseType(next: AgentTypeDefinition | undefined) {
    setDefinition(next);
    setChoice(undefined);
    setIndustry(undefined);
    setProfileId('');
    setPracticeAreas([]);
    setOtherOpen(false);
    setOtherPractice('');
    setProfilesLoaded(false);
    setSettings(EMPTY_INTERVIEW_SETTINGS);
    setAvatar(null);
    setNameEdited(false);
    setAgentName('');
    setSavedAgent(null);
    setSaving(false);
    setSaveError(null);
    setPresetsDone(false);
    setWizardStep(0);
    setFurthestStep(0);
    setWorkplace({ jobTitle: '', templateId: null, industry: '', sector: null, company: '' });
  }

  /** Moves to a section and remembers the furthest one, so it can be opened again. */
  function goTo(index: number) {
    setWizardStep(index);
    setFurthestStep((reached) => Math.max(reached, index));
  }

  /** Picks a profile and starts the practice areas from what that profile already has. */
  function chooseProfile(id: string) {
    if (id !== profileId) {
      const next = profiles.find((item) => item.id === id);
      if (next) {
        const custom = next.practiceAreas.filter((area) => !isPracticeChoice(area));
        setPracticeAreas(next.practiceAreas.filter(isPracticeChoice));
        setOtherPractice(custom.join(', '));
        setOtherOpen(custom.length > 0);
      }
    }
    setProfileId(id);
  }

  function changePractice(areas: string[]) {
    const order = PRACTICE_CHOICES.map((choice) => choice.id);
    setPracticeAreas(order.filter((id) => areas.includes(id)));
  }

  function changeOtherOpen(open: boolean) {
    setOtherOpen(open);
    if (!open) setOtherPractice('');
  }

  const chosenPractice = [
    ...practiceAreas,
    ...(otherOpen ? parseOtherPractice(otherPractice, practiceAreas) : []),
  ];

  const name = nameEdited ? agentName : suggestedAgentName(workplace.jobTitle);

  /** Creates the agent, or updates it when this wizard has already saved one. */
  async function persist(): Promise<string | null> {
    if (!definition || savingLock.current) return savedAgent?.id ?? null;
    const trimmed = name.trim();
    if (!trimmed) {
      setSaveError('Agenten trenger et navn.');
      return null;
    }
    const built = wizardConfiguration({
      workplace,
      interviewer: choice ?? null,
      profile: profiles.find((item) => item.id === profileId) ?? null,
      practiceAreas: chosenPractice,
      settings,
    });
    if (!built) {
      setSaveError('Noen obligatoriske felt mangler. Gå tilbake og fyll dem ut.');
      return null;
    }

    savingLock.current = true;
    setSaving(true);
    setSaveError(null);
    const advanced: AdvancedSettings = {
      model: settings.model,
      temperature: settings.temperature,
      customPrompt: settings.customPrompt?.trim() ? settings.customPrompt : null,
    };
    try {
      const id = savedAgent
        ? (
            await updateAgent(
              savedAgent.id,
              trimmed,
              built.answers,
              built.sources,
              advanced,
              avatar,
            )
          ).id
        : await saveConfiguredAgent(
            trimmed,
            definition,
            built.answers,
            built.sources,
            advanced,
            avatar,
          );
      setSavedAgent({ id, name: trimmed });
      return id;
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Noe gikk galt. Prøv igjen.');
      return null;
    } finally {
      savingLock.current = false;
      setSaving(false);
    }
  }

  if (!definition) {
    return (
      <>
        <header className={styles.header}>
          <h1 className={styles.title}>Sett opp en agent</h1>
          <p className={styles.lead}>
            Velg hva slags agent du vil sette opp, og svar så på spørsmålene fra assistenten. Da
            lager vi en AI-agent som jobbsøkeren kan øve med. For en intervjuer kan du også velge
            maler for intervjueren og bransjen og en jobbsøkerprofil, eller la assistenten spørre
            deg om alt.
          </p>
        </header>
        <AgentTypePicker
          types={listAccessibleAgentTypes()}
          planned={listPlannedAgentTypes()}
          onSelect={chooseType}
        />
      </>
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

  if (definition.id === 'interviewer' && wizardStep <= 0) {
    return (
      <StillingStep
        value={workplace}
        templates={industryTemplates}
        onChange={setWorkplace}
        onNext={() => goTo(1)}
        onGoTo={goTo}
        reached={furthestStep}
      />
    );
  }

  if (definition.id === 'interviewer' && wizardStep === 1) {
    return (
      <WizardFrame current={1} onGoTo={goTo} reached={furthestStep}>
        <div className={stepStyles.form}>
          {chosenType}
          {usesIndustries && industry !== undefined && chosenIndustry}
          <TemplatePicker
            embedded
            asRadios
            selectedId={choice ? choice.id : null}
            templates={builtInTemplates(definition.id)}
            savedTemplates={saved}
            agentType={definition.id}
            lead={presets.template?.text.pickerLead}
            onSelect={setChoice}
            onDeleted={(id) => setSaved((current) => current.filter((item) => item.id !== id))}
          />
          <div className={styles.presetActions}>
            <Button variant="outlined" onClick={() => setChoice(null)}>
              Fortsett uten mal
            </Button>
            <Button
              component={Link}
              href={`/create-template?agentType=${encodeURIComponent(definition.id)}&returnTo=${encodeURIComponent(`/configure?type=${definition.id}&step=intervjuer`)}`}
              variant="outlined"
            >
              Lag en ny mal
            </Button>
            <div className={stepStyles.nav}>
              <Button onClick={() => goTo(0)}>Tilbake</Button>
              <Button variant="contained" onClick={() => goTo(2)}>
                Neste
              </Button>
            </div>
          </div>
        </div>
      </WizardFrame>
    );
  }

  if (definition.id === 'interviewer' && wizardStep === 2) {
    return (
      <JobSeekerStep
        profiles={profiles}
        loading={!profilesLoaded}
        intro={chosenType}
        onGoTo={goTo}
        reached={furthestStep}
        onSelect={chooseProfile}
        selectedId={profileId}
        practiceAreas={practiceAreas}
        onPracticeChange={changePractice}
        otherOpen={otherOpen}
        onOtherOpenChange={changeOtherOpen}
        otherPractice={otherPractice}
        onOtherPracticeChange={setOtherPractice}
        onNext={() => goTo(3)}
        onBack={() => goTo(1)}
      />
    );
  }

  if (definition.id === 'interviewer' && (wizardStep === 3 || wizardStep === 4)) {
    return (
      <SettingsStep
        value={settings}
        onChange={setSettings}
        intro={chosenType}
        onGoTo={goTo}
        reached={furthestStep}
        expanded={wizardStep === 4}
        overview={{
          workplace,
          jobTemplates: industryTemplates,
          interviewerTitle: choice ? choice.title : null,
          profileLabel: profiles.find((item) => item.id === profileId)?.label ?? null,
          practiceAreas: chosenPractice,
          settings,
        }}
        avatar={avatar}
        onAvatarChange={setAvatar}
        name={name}
        onNameChange={(next) => {
          setNameEdited(true);
          setAgentName(next);
        }}
        saving={saving}
        saved={savedAgent}
        saveError={saveError}
        onSave={() => {
          void persist();
        }}
        onTest={() => {
          void persist().then((id) => {
            if (id) router.push(`/test-chat?agent=${encodeURIComponent(id)}`);
          });
        }}
        onBack={() => goTo(2)}
        onFinishBack={() => goTo(3)}
        onNext={() => goTo(4)}
      />
    );
  }

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
