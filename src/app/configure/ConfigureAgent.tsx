'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Button from '@mui/material/Button';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';

import { AgentTypePicker } from '@/components/agents/AgentTypePicker';
import { fetchLegalTemplates } from '@/components/legalTemplates/api';
import { LegalTemplateSelect } from '@/components/legalTemplates/LegalTemplateSelect';
import { fetchProfiles } from '@/components/profiles/api';
import { ProfileSelect } from '@/components/profiles/ProfileSelect';
import { IndustryPicker } from '@/components/templates/IndustryPicker';
import { IndustryPreview } from '@/components/templates/IndustryPreview';
import { TemplatePicker } from '@/components/templates/TemplatePicker';
import { useWorkplaceTemplates } from '@/components/templates/useWorkplaceTemplates';
import { industryTemplates, type IndustryTemplate } from '@/data/industry-templates';
import { builtInLegalTemplates } from '@/data/legal-templates';
import { builtInTemplates, type AgentTemplate } from '@/data/templates';
import {
  getAgentType,
  listAccessibleAgentTypes,
  listPlannedAgentTypes,
} from '@/domain/agentTypes/registry';
import type { AdvancedSettings } from '@/domain/advancedSettings';
import type { AgentTypeDefinition } from '@/domain/agentTypes/types';
import { useIsClient } from '@/lib/useOnceInBrowser';
import {
  isPracticeChoice,
  parseOtherPractice,
  PRACTICE_CHOICES,
  type JobSeekerProfile,
} from '@/domain/jobSeekerProfile';
import type { LegalTemplate } from '@/domain/legalTemplate';
import { industryNames } from '@/domain/workplaceTemplate';
import { publishAgent, updateAgent } from '../browse-agents/api';
import {
  AGENT_PUBLISHED_FLASH,
  AGENT_SAVED_FLASH,
  DRAFT_SAVED_FLASH,
  setAgentsFlash,
} from '../browse-agents/flash';
import { fetchSavedTemplates, saveConfiguredAgent } from './api';
import { ConfigurationChat } from './ConfigurationChat';
import { JobSeekerStep } from './JobSeekerStep';
import { EMPTY_INTERVIEW_SETTINGS, SettingsStep, type InterviewSettings } from './SettingsStep';
import { StillingStep, WizardFrame, type Workplace } from './StillingStep';
import { suggestedAgentName, wizardConfiguration } from './wizardConfiguration';
import { clearWizardDraft, readWizardDraft, writeWizardDraft } from './wizardDraft';
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
 * fills it in: a job seeker profile, legal templates and an interviewer template in one step, then
 * an industry template in the next. All are optional. The built-in interviewer templates come first, then the
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
  /** Profile id, '' for «Fortsett uten mal», or null until they choose. */
  const [profileId, setProfileId] = useState<string | null>(null);
  const [practiceAreas, setPracticeAreas] = useState<string[]>([]);
  const [savedLegal, setSavedLegal] = useState<LegalTemplate[]>([]);
  const [legalIds, setLegalIds] = useState<string[]>([]);
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
  // False until a stored draft has been read (or found missing), so we do not overwrite it.
  const [draftReady, setDraftReady] = useState(false);
  const isClient = useIsClient();

  const presets = definition?.presets ?? {};
  const usesTemplates = Boolean(presets.template);
  const agentType = definition?.id;
  const usesProfiles = Boolean(presets.jobSeekerProfile);
  const usesIndustries = Boolean(presets.industryTemplate);
  const usesLegal = Boolean(presets.legalTemplates);
  // The built-in stillingsmaler and bransjemaler, and the counsellor's own once they have loaded.
  const workplaceTemplates = useWorkplaceTemplates(
    definition?.id === 'interviewer' || usesIndustries,
  );
  const jobTemplates = workplaceTemplates.jobs;

  // Restore once after hydration (setState during render when the client flag flips).
  if (isClient && !draftReady) {
    const draft = readWizardDraft();
    if (
      draft &&
      draft.agentTypeId === 'interviewer' &&
      (!initialTypeId || initialTypeId === draft.agentTypeId)
    ) {
      const type = getAgentType(draft.agentTypeId);
      if (type) {
        setDefinition(type);
        setWorkplace(draft.workplace);
        setChoice(draft.hasTemplateChoice ? draft.template : undefined);
        setProfileId(draft.profileId || (draft.furthestStep >= 2 ? '' : null));
        setPracticeAreas(draft.practiceAreas);
        setLegalIds(draft.legalIds ?? []);
        setOtherOpen(draft.otherOpen);
        setOtherPractice(draft.otherPractice);
        setSettings(draft.settings);
        setAvatar(draft.avatar);
        setNameEdited(draft.nameEdited);
        setAgentName(draft.agentName);
        setPresetsDone(draft.presetsDone);
        // A returnTo link can ask for the intervjuer step; otherwise open where they left off.
        if (initialTypeId === 'interviewer' && initialStep === 'intervjuer') {
          setWizardStep(1);
          setFurthestStep(Math.max(draft.furthestStep, 1));
        } else {
          setWizardStep(draft.wizardStep);
          setFurthestStep(draft.furthestStep);
        }
      }
    }
    setDraftReady(true);
  }

  useEffect(() => {
    if (!draftReady || definition?.id !== 'interviewer') return;
    writeWizardDraft({
      version: 1,
      agentTypeId: 'interviewer',
      wizardStep,
      furthestStep,
      workplace,
      hasTemplateChoice: choice !== undefined,
      template: choice ?? null,
      profileId: profileId ?? '',
      practiceAreas,
      legalIds,
      otherOpen,
      otherPractice,
      settings,
      avatar,
      nameEdited,
      agentName,
      presetsDone,
    });
  }, [
    draftReady,
    definition?.id,
    wizardStep,
    furthestStep,
    workplace,
    choice,
    profileId,
    practiceAreas,
    legalIds,
    otherOpen,
    otherPractice,
    settings,
    avatar,
    nameEdited,
    agentName,
    presetsDone,
  ]);

  function saveDraft() {
    if (definition?.id !== 'interviewer') return;
    writeWizardDraft({
      version: 1,
      agentTypeId: 'interviewer',
      wizardStep,
      furthestStep,
      workplace,
      hasTemplateChoice: choice !== undefined,
      template: choice ?? null,
      profileId: profileId ?? '',
      practiceAreas,
      legalIds,
      otherOpen,
      otherPractice,
      settings,
      avatar,
      nameEdited,
      agentName,
      presetsDone,
    });
  }

  /** Writes the unfinished wizard and opens the agents list, where the utkast card appears. */
  function saveDraftAndLeave() {
    saveDraft();
    setAgentsFlash(DRAFT_SAVED_FLASH);
    router.push('/browse-agents');
  }

  useEffect(() => {
    if (!agentType || (!usesTemplates && !usesProfiles && !usesLegal)) return;
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
    if (usesLegal) fetchLegalTemplates(controller.signal).then(setSavedLegal).catch(logError);
    return () => controller.abort();
  }, [agentType, usesTemplates, usesProfiles, usesLegal]);

  function chooseType(next: AgentTypeDefinition | undefined) {
    if (!next) clearWizardDraft();
    setDefinition(next);
    setChoice(undefined);
    setIndustry(undefined);
    setProfileId(null);
    setPracticeAreas([]);
    setLegalIds([]);
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

  /** Picks a profile (or '' for without) and starts practice areas from that profile. */
  function chooseProfile(id: string) {
    if (id !== profileId) {
      const next = id ? profiles.find((item) => item.id === id) : undefined;
      if (next) {
        const custom = next.practiceAreas.filter((area) => !isPracticeChoice(area));
        setPracticeAreas(next.practiceAreas.filter(isPracticeChoice));
        setOtherPractice(custom.join(', '));
        setOtherOpen(custom.length > 0);
      } else {
        // Leaving a mal: drop its practice areas so the counsellor picks their own.
        setPracticeAreas([]);
        setOtherPractice('');
        setOtherOpen(false);
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

  const legalOptions = [...builtInLegalTemplates, ...savedLegal];
  // In the order they were chosen. One that is no longer offered is left out.
  const legalTemplates = usesLegal
    ? legalIds.flatMap((id) => legalOptions.filter((item) => item.id === id))
    : [];

  /** The answers the wizard's choices are saved as, or null while a required choice is missing. */
  function builtConfiguration() {
    return wizardConfiguration({
      workplace,
      jobTemplates,
      industryTemplates: workplaceTemplates.industries,
      interviewer: choice ?? null,
      profile: (profileId && profiles.find((item) => item.id === profileId)) || null,
      practiceAreas: chosenPractice,
      legalTemplates,
      settings,
    });
  }

  /** Creates the agent, or updates it when this wizard has already saved one. */
  async function persist(): Promise<{ id: string } | { error: string }> {
    if (!definition || savingLock.current) {
      return savedAgent ? { id: savedAgent.id } : { error: 'Noe gikk galt. Prøv igjen.' };
    }
    const trimmed = name.trim();
    if (!trimmed) {
      const message = 'Agenten trenger et navn.';
      setSaveError(message);
      return { error: message };
    }
    const built = builtConfiguration();
    if (!built) {
      const message = 'Noen obligatoriske felt mangler. Gå tilbake og fyll dem ut.';
      setSaveError(message);
      return { error: message };
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
      clearWizardDraft();
      return { id };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Noe gikk galt. Prøv igjen.';
      setSaveError(message);
      return { error: message };
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
            maler for intervjueren og bransjen og en jobbsøkermal, eller la assistenten spørre deg
            om alt.
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

  // The steps this type has, e.g. "Velg intervjuer, jobbsøkermal og lovverk", then "Velg bransje".
  const usesPresetStep = usesTemplates || usesProfiles || usesLegal;
  const presetStep = `Velg ${listInNorwegian(
    [
      usesTemplates && fieldLabel(presets.template?.field).toLowerCase(),
      usesProfiles && 'jobbsøkermal',
      usesLegal && 'lovverk',
    ].filter((item): item is string => Boolean(item)),
  )}`;
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

  const profile =
    (usesProfiles && profileId && profiles.find((item) => item.id === profileId)) || null;
  const template = usesTemplates ? (choice ?? null) : null;
  const choosingPresets = usesTemplates
    ? choice === undefined
    : (usesProfiles || usesLegal) && !presetsDone;

  if (definition.id === 'interviewer' && wizardStep <= 0) {
    return (
      <StillingStep
        value={workplace}
        templates={jobTemplates}
        industries={industryNames(jobTemplates, workplaceTemplates.industries)}
        onChange={setWorkplace}
        onNext={() => goTo(1)}
        onGoTo={goTo}
        reached={furthestStep}
        onSaveDraft={saveDraftAndLeave}
      />
    );
  }

  if (definition.id === 'interviewer' && wizardStep === 1) {
    return (
      <WizardFrame current={1} onGoTo={goTo} reached={furthestStep} onSaveDraft={saveDraftAndLeave}>
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
            returnTo={`/configure?type=${definition.id}&step=intervjuer`}
            onSelect={setChoice}
            onDeleted={(id) => setSaved((current) => current.filter((item) => item.id !== id))}
          />
          <div className={styles.choiceActions}>
            <Button
              variant={choice === null ? 'contained' : 'outlined'}
              aria-pressed={choice === null}
              onClick={() => setChoice(null)}
            >
              Fortsett uten intervjuermal
            </Button>
            <Button
              component={Link}
              href={`/create-template?agentType=${encodeURIComponent(definition.id)}&returnTo=${encodeURIComponent(`/configure?type=${definition.id}&step=intervjuer`)}`}
              variant="outlined"
            >
              Lag en ny intervjuermal
            </Button>
          </div>
          {usesLegal && (
            <LegalTemplateSelect templates={legalOptions} value={legalIds} onChange={setLegalIds} />
          )}
          <div className={stepStyles.actions}>
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
        onSaveDraft={saveDraftAndLeave}
      />
    );
  }

  if (definition.id === 'interviewer' && (wizardStep === 3 || wizardStep === 4)) {
    // Only the last step shows how the answers shape the interviewer.
    const built = wizardStep === 4 ? builtConfiguration() : null;
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
          jobTemplates,
          interviewerTitle: choice ? choice.title : null,
          profileLabel:
            (profileId && profiles.find((item) => item.id === profileId)?.label) || null,
          legalTitles: legalTemplates.map(({ title }) => title),
          practiceAreas: chosenPractice,
          settings,
        }}
        effects={built ? definition.explainAnswers(built.answers) : []}
        avatar={avatar}
        onAvatarChange={setAvatar}
        name={name}
        onNameChange={(next) => {
          setNameEdited(true);
          setAgentName(next);
        }}
        saving={saving}
        saveError={saveError}
        onSave={() => {
          void persist().then((result) => {
            if (!('id' in result)) return;
            setAgentsFlash(AGENT_SAVED_FLASH);
            router.push('/browse-agents');
          });
        }}
        onPublish={async (publicName, publicDescription) => {
          const result = await persist();
          if (!('id' in result)) throw new Error(result.error);
          try {
            await publishAgent(result.id, publicName, publicDescription);
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Noe gikk galt. Prøv igjen.';
            setSaveError(message);
            throw new Error(message);
          }
          setAgentsFlash(AGENT_PUBLISHED_FLASH);
          router.push('/browse-agents');
        }}
        onTest={() => {
          void persist().then((result) => {
            if ('id' in result) router.push(`/test-chat?agent=${encodeURIComponent(result.id)}`);
          });
        }}
        onBack={() => goTo(2)}
        onFinishBack={() => goTo(3)}
        onNext={() => goTo(4)}
        onSaveDraft={saveDraftAndLeave}
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
          <ProfileSelect profiles={profiles} value={profileId ?? ''} onChange={setProfileId} />
        )}
        {usesLegal && (
          <LegalTemplateSelect templates={legalOptions} value={legalIds} onChange={setLegalIds} />
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
            <strong>{profile ? profile.label : 'Ingen mal valgt'}</strong>
          </>
        )}
        {(usesTemplates || usesProfiles) && usesLegal && <br />}
        {usesLegal && (
          <>
            {fieldLabel(presets.legalTemplates)}:{' '}
            <strong>
              {legalTemplates.length > 0
                ? legalTemplates.map(({ title }) => title).join(', ')
                : 'Ikke valgt'}
            </strong>
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
        {[usesTemplates, usesProfiles, usesLegal].filter(Boolean).length > 1
          ? 'Bytt maler'
          : 'Bytt mal'}
      </Button>
    </div>
  );

  if (usesIndustries && industry === undefined) {
    return (
      <>
        <Steps steps={steps} active={steps.length - 2} />
        {chosenType}
        {chosenPresets}
        {/* The chat's server route only knows the built-in stillingsmaler. */}
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
        key={JSON.stringify([
          definition.id,
          template?.id,
          profile?.id,
          chosenIndustryTemplate?.id,
          legalIds,
        ])}
        definition={definition}
        template={template}
        profile={profile}
        industry={chosenIndustryTemplate}
        legalTemplates={legalTemplates}
      />
    </>
  );
}

/** «a», «a og b», «a, b og c». */
function listInNorwegian(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} og ${items[items.length - 1]}`;
}
