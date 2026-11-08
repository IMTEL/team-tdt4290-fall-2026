'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Button from '@mui/material/Button';

import { AgentTypePicker } from '@/components/agents/AgentTypePicker';
import { fetchLegalTemplates } from '@/components/legalTemplates/api';
import { LegalTemplateSelect } from '@/components/legalTemplates/LegalTemplateSelect';
import { fetchProfiles } from '@/components/profiles/api';
import { TemplatePicker } from '@/components/templates/TemplatePicker';
import { useWorkplaceTemplates } from '@/components/templates/useWorkplaceTemplates';
import {
  builtInLegalTemplateIds,
  builtInLegalTemplates,
  normalizeLegalTemplateIds,
} from '@/data/legal-templates';
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
import { JobSeekerStep } from './JobSeekerStep';
import { AiSettingsStep } from './AiSettingsStep';
import { EMPTY_INTERVIEW_SETTINGS, SettingsStep, type InterviewSettings } from './SettingsStep';
import {
  ChoiceSummary,
  StillingStep,
  WizardFrame,
  WizardNav,
  type Workplace,
} from './StillingStep';
import { wizardTemplatePeeks } from './templatePeeks';
import { suggestedAgentName, wizardConfiguration } from './wizardConfiguration';
import {
  clearWizardDraft,
  configureDraftHref,
  createWizardDraftId,
  readWizardDraft,
  writeWizardDraft,
} from './wizardDraft';
import styles from './page.module.css';
import stepStyles from './StillingStep.module.css';

// undefined: the counsellor hasn't chosen yet. null: they chose to continue without one.
type Choice<T> = T | null | undefined;

/**
 * First the counsellor picks the type of agent, then sets it up in that type's form wizard. Only the
 * interviewer has a wizard so far; see docs/extending.md for how to give a new type one.
 */
export function ConfigureAgent({
  initialTypeId = null,
  initialStep = null,
  startNew = false,
  initialDraftId = null,
}: {
  initialTypeId?: string | null;
  initialStep?: string | null;
  /** True when «Ny agent» was chosen: ignore a stored utkast so the wizard starts empty. */
  startNew?: boolean;
  /** Opens this utkast. Without it, the newest draft is restored unless `startNew`. */
  initialDraftId?: string | null;
}) {
  const [definition, setDefinition] = useState<AgentTypeDefinition | undefined>(() =>
    initialTypeId ? getAgentType(initialTypeId) : undefined,
  );
  const [choice, setChoice] = useState<Choice<AgentTemplate>>(undefined);
  const [saved, setSaved] = useState<AgentTemplate[]>([]);
  const [profiles, setProfiles] = useState<JobSeekerProfile[]>([]);
  const [profilesLoaded, setProfilesLoaded] = useState(false);
  /** Profile id, '' for «Fortsett uten mal», or null until they choose. */
  const [profileId, setProfileId] = useState<string | null>(null);
  const [practiceAreas, setPracticeAreas] = useState<string[]>([]);
  const [savedLegal, setSavedLegal] = useState<LegalTemplate[]>([]);
  const [legalIds, setLegalIds] = useState<string[]>(builtInLegalTemplateIds);
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
  // Which interviewer screen is open. 0 stilling, 1 intervjuer, 2 jobbsøker, 3 innstillinger,
  // 4 AI-innstillinger, 5 fullføre.
  const [wizardStep, setWizardStep] = useState(interviewerStepIndex(initialTypeId, initialStep));
  const [furthestStep, setFurthestStep] = useState(
    interviewerStepIndex(initialTypeId, initialStep),
  );
  // Neste from Innstillinger skips AI-innstillinger. Tilbake from Fullføre returns there only if
  // the counsellor opened that step.
  const [openedAiSettings, setOpenedAiSettings] = useState(false);
  const [workplace, setWorkplace] = useState<Workplace>({
    jobTitle: '',
    templateId: null,
    industry: '',
    sector: null,
    company: '',
  });
  // False until a stored draft has been read (or found missing), so we do not overwrite it.
  const [draftReady, setDraftReady] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(initialDraftId);
  const isClient = useIsClient();

  const presets = definition?.presets ?? {};
  const usesTemplates = Boolean(presets.template);
  const agentType = definition?.id;
  const usesProfiles = Boolean(presets.jobSeekerProfile);
  const usesLegal = Boolean(presets.legalTemplates);
  // The built-in stillingsmaler and bransjemaler, and the counsellor's own once they have loaded.
  const workplaceTemplates = useWorkplaceTemplates(definition?.id === 'interviewer');
  const jobTemplates = workplaceTemplates.jobs;

  // Restore once after hydration (setState during render when the client flag flips).
  if (isClient && !draftReady) {
    if (startNew) {
      setDraftId(createWizardDraftId());
      setLegalIds(builtInLegalTemplateIds());
    } else {
      const draft = readWizardDraft(initialDraftId ?? undefined);
      if (
        draft &&
        draft.agentTypeId === 'interviewer' &&
        (!initialTypeId || initialTypeId === draft.agentTypeId)
      ) {
        const type = getAgentType(draft.agentTypeId);
        if (type) {
          setDraftId(draft.id);
          setDefinition(type);
          setWorkplace(draft.workplace);
          setChoice(draft.hasTemplateChoice ? draft.template : undefined);
          setProfileId(draft.profileId || (draft.furthestStep >= 2 ? '' : null));
          setPracticeAreas(draft.practiceAreas);
          setLegalIds(normalizeLegalTemplateIds(draft.legalIds ?? builtInLegalTemplateIds()));
          setOtherOpen(draft.otherOpen);
          setOtherPractice(draft.otherPractice);
          setSettings(draft.settings);
          setAvatar(draft.avatar);
          setNameEdited(draft.nameEdited);
          setAgentName(draft.agentName);
          // A returnTo link can ask for a named step; otherwise open where they left off.
          const namedStep = interviewerStepIndex(initialTypeId, initialStep);
          if (namedStep > 0) {
            setWizardStep(namedStep);
            setFurthestStep(Math.max(draft.furthestStep, namedStep));
            setOpenedAiSettings(Boolean(draft.openedAiSettings) || namedStep === 4);
          } else {
            setWizardStep(draft.wizardStep);
            setFurthestStep(draft.furthestStep);
            setOpenedAiSettings(Boolean(draft.openedAiSettings) || draft.wizardStep === 4);
          }
        }
      } else if (!draftId) {
        setDraftId(createWizardDraftId());
      }
    }
    setDraftReady(true);
  }

  useEffect(() => {
    if (!draftId || typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    let changed = false;
    if (url.searchParams.has('new')) {
      url.searchParams.delete('new');
      changed = true;
    }
    if (url.searchParams.get('draft') !== draftId) {
      url.searchParams.set('draft', draftId);
      changed = true;
    }
    if (!changed) return;
    const query = url.searchParams.toString();
    window.history.replaceState(null, '', `${url.pathname}${query ? `?${query}` : ''}${url.hash}`);
  }, [draftId]);

  const currentDraft = useCallback(() => {
    if (!draftId) return null;
    return {
      version: 2 as const,
      id: draftId,
      agentTypeId: 'interviewer',
      wizardStep,
      furthestStep,
      openedAiSettings,
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
    };
  }, [
    draftId,
    wizardStep,
    furthestStep,
    openedAiSettings,
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
  ]);

  useEffect(() => {
    if (!draftReady || definition?.id !== 'interviewer') return;
    const draft = currentDraft();
    if (draft) writeWizardDraft(draft);
  }, [draftReady, definition?.id, currentDraft]);

  function saveDraft() {
    if (definition?.id !== 'interviewer') return;
    const draft = currentDraft();
    if (draft) writeWizardDraft(draft);
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
    if (!next && draftId) clearWizardDraft(draftId);
    setDefinition(next);
    setChoice(undefined);
    setProfileId(null);
    setPracticeAreas([]);
    setLegalIds(next?.presets?.legalTemplates ? builtInLegalTemplateIds() : []);
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
    setWizardStep(0);
    setFurthestStep(0);
    setOpenedAiSettings(false);
    setWorkplace({ jobTitle: '', templateId: null, industry: '', sector: null, company: '' });
  }

  /** Moves to a section and remembers the furthest one, so it can be opened again. */
  function goTo(index: number) {
    setWizardStep(index);
    setFurthestStep((reached) => Math.max(reached, index));
    if (index === 4) setOpenedAiSettings(true);
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
    ? normalizeLegalTemplateIds(legalIds).flatMap((id) =>
        legalOptions.filter((item) => item.id === id),
      )
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
      maxTokens: settings.maxTokens,
      customPrompt: null,
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
      if (draftId) clearWizardDraft(draftId);
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
            Velg hva slags agent du vil sette opp, og fyll så ut skjemaet steg for steg. Da lager vi
            en AI-agent som jobbsøkeren kan øve med.
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

  const wizardHref = (step: string) =>
    draftId ? configureDraftHref(draftId, step) : `/configure?type=${definition.id}&step=${step}`;

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

  const profile =
    (usesProfiles && profileId && profiles.find((item) => item.id === profileId)) || null;
  const peeks = wizardTemplatePeeks({
    workplace,
    jobTemplates,
    industryTemplates: workplaceTemplates.industries,
    interviewer: choice ?? null,
    profile,
    legalTemplates,
  });

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
        openedAiSettings={openedAiSettings}
        onSaveDraft={saveDraftAndLeave}
        peeks={peeks}
      />
    );
  }

  if (definition.id === 'interviewer' && wizardStep === 1) {
    return (
      <WizardFrame
        current={1}
        onGoTo={goTo}
        reached={furthestStep}
        openedAiSettings={openedAiSettings}
        peeks={peeks}
      >
        <div className={stepStyles.form}>
          {chosenType}
          <TemplatePicker
            embedded
            asRadios
            selectedId={choice ? choice.id : null}
            templates={builtInTemplates(definition.id)}
            savedTemplates={saved}
            agentType={definition.id}
            lead={presets.template?.text.pickerLead}
            returnTo={wizardHref('intervjuer')}
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
              href={`/create-template?agentType=${encodeURIComponent(definition.id)}&returnTo=${encodeURIComponent(
                wizardHref('intervjuer'),
              )}`}
              variant="outlined"
            >
              Lag en ny intervjuermal
            </Button>
          </div>
          {usesLegal && (
            <LegalTemplateSelect templates={legalOptions} value={legalIds} onChange={setLegalIds} />
          )}
          <ChoiceSummary
            lines={[
              {
                label: 'Mal',
                value:
                  choice === null
                    ? 'Ingen mal er valgt, så intervjueren er nøytral og profesjonell.'
                    : (choice?.title ?? ''),
              },
              { label: 'Lovverk', value: legalTemplates.map((item) => item.title).join(', ') },
            ]}
          />
          <WizardNav
            onBack={() => goTo(0)}
            onNext={() => goTo(2)}
            onSaveDraft={saveDraftAndLeave}
          />
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
        openedAiSettings={openedAiSettings}
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
        peeks={peeks}
        returnTo={wizardHref('jobbsøker')}
        onDeleted={(id) => {
          setProfiles((current) => current.filter((item) => item.id !== id));
          if (profileId === id) {
            setProfileId(null);
            setPracticeAreas([]);
            setOtherPractice('');
            setOtherOpen(false);
          }
        }}
      />
    );
  }

  if (definition.id === 'interviewer' && wizardStep === 4) {
    return (
      <AiSettingsStep
        value={settings}
        onChange={setSettings}
        intro={chosenType}
        onGoTo={goTo}
        reached={furthestStep}
        openedAiSettings={openedAiSettings}
        onBack={() => goTo(3)}
        onNext={() => goTo(5)}
        onSaveDraft={saveDraftAndLeave}
        peeks={peeks}
      />
    );
  }

  if (definition.id === 'interviewer' && (wizardStep === 3 || wizardStep === 5)) {
    // Only the last step shows how the answers shape the interviewer.
    const built = wizardStep === 5 ? builtConfiguration() : null;
    return (
      <SettingsStep
        value={settings}
        onChange={setSettings}
        intro={chosenType}
        onGoTo={goTo}
        reached={furthestStep}
        openedAiSettings={openedAiSettings}
        expanded={wizardStep === 5}
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
        onFinishBack={() => goTo(openedAiSettings ? 4 : 3)}
        onAiSettings={() => goTo(4)}
        onNext={() => goTo(5)}
        onSaveDraft={saveDraftAndLeave}
        peeks={peeks}
      />
    );
  }

  // A type without a wizard of its own can't be set up yet.
  return (
    <>
      {chosenType}
      <p className={styles.lead}>Denne agenttypen kan ikke settes opp ennå.</p>
    </>
  );
}

/** Named wizard steps from returnTo links, or 0 for the first interviewer screen. */
function interviewerStepIndex(
  typeId: string | null | undefined,
  step: string | null | undefined,
): number {
  if (typeId !== 'interviewer') return 0;
  if (step === 'intervjuer') return 1;
  if (step === 'jobbsøker') return 2;
  return 0;
}
