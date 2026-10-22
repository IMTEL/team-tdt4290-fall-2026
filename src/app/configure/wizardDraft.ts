import type { AgentTemplate } from '@/data/templates';
import type { InterviewSettings } from './SettingsStep';
import type { Workplace } from './StillingStep';

const STORAGE_KEY = 'kfi-configure-draft';
const VERSION = 1;

const draftListeners = new Set<() => void>();

/** Cached so useSyncExternalStore getSnapshot returns a stable reference between writes. */
let cachedRaw: string | null | undefined;
let cachedDraft: WizardDraft | null = null;

/** Lets the agents list refresh when this browser’s draft is written or cleared. */
export function subscribeWizardDraft(onStoreChange: () => void): () => void {
  draftListeners.add(onStoreChange);
  return () => {
    draftListeners.delete(onStoreChange);
  };
}

function emitWizardDraftChange() {
  cachedRaw = undefined;
  cachedDraft = null;
  for (const listener of draftListeners) listener();
}

/**
 * What the counsellor has filled in so far for a new interviewer. Kept in the browser so leaving
 * mid-wizard does not lose the work.
 */
export type WizardDraft = {
  version: typeof VERSION;
  agentTypeId: string;
  wizardStep: number;
  furthestStep: number;
  workplace: Workplace;
  /** False until the counsellor picks a template or continues without one. */
  hasTemplateChoice: boolean;
  /** The chosen template, or null for «Fortsett uten mal». */
  template: AgentTemplate | null;
  profileId: string;
  practiceAreas: string[];
  otherOpen: boolean;
  otherPractice: string;
  settings: InterviewSettings;
  avatar: string | null;
  nameEdited: boolean;
  agentName: string;
  presetsDone: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isWorkplace(value: unknown): value is Workplace {
  if (!isRecord(value)) return false;
  return (
    typeof value.jobTitle === 'string' &&
    (value.templateId === null || typeof value.templateId === 'string') &&
    typeof value.industry === 'string' &&
    (value.sector === null ||
      value.sector === 'offentlig' ||
      value.sector === 'privat' ||
      value.sector === 'ikke-oppgitt') &&
    typeof value.company === 'string'
  );
}

function isSettings(value: unknown): value is InterviewSettings {
  if (!isRecord(value)) return false;
  return (
    (value.interviewType === null || typeof value.interviewType === 'string') &&
    (value.difficulty === null || typeof value.difficulty === 'string') &&
    (value.questionCount === null || typeof value.questionCount === 'string') &&
    typeof value.questionCountDetail === 'string' &&
    (value.followUp === null || value.followUp === 'ja' || value.followUp === 'nei') &&
    typeof value.ownQuestions === 'string' &&
    typeof value.extra === 'string' &&
    typeof value.model === 'string' &&
    typeof value.temperature === 'number' &&
    (value.customPrompt === null || typeof value.customPrompt === 'string')
  );
}

function isTemplate(value: unknown): value is AgentTemplate {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.agentType === 'string' &&
    typeof value.title === 'string' &&
    typeof value.description === 'string' &&
    Array.isArray(value.focus) &&
    value.focus.every((item) => typeof item === 'string') &&
    typeof value.persona === 'string'
  );
}

function isDraft(value: unknown): value is WizardDraft {
  if (!isRecord(value) || value.version !== VERSION) return false;
  return (
    typeof value.agentTypeId === 'string' &&
    typeof value.wizardStep === 'number' &&
    typeof value.furthestStep === 'number' &&
    isWorkplace(value.workplace) &&
    typeof value.hasTemplateChoice === 'boolean' &&
    (value.template === null || isTemplate(value.template)) &&
    typeof value.profileId === 'string' &&
    Array.isArray(value.practiceAreas) &&
    value.practiceAreas.every((item) => typeof item === 'string') &&
    typeof value.otherOpen === 'boolean' &&
    typeof value.otherPractice === 'string' &&
    isSettings(value.settings) &&
    (value.avatar === null || typeof value.avatar === 'string') &&
    typeof value.nameEdited === 'boolean' &&
    typeof value.agentName === 'string' &&
    typeof value.presetsDone === 'boolean'
  );
}

/** The unfinished interviewer draft in this browser, or null when there is none. */
export function readWizardDraft(): WizardDraft | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRaw) return cachedDraft;
    cachedRaw = raw;
    if (!raw) {
      cachedDraft = null;
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    cachedDraft = isDraft(parsed) ? parsed : null;
    return cachedDraft;
  } catch {
    cachedRaw = undefined;
    cachedDraft = null;
    return null;
  }
}

/** Remembers the wizard so far. Private mode or a full disk is ignored. */
export function writeWizardDraft(draft: WizardDraft): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    emitWizardDraftChange();
  } catch {
    // Private mode, or storage full.
  }
}

/** Drops the draft after the agent is saved, or when the counsellor starts over. */
export function clearWizardDraft(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    emitWizardDraftChange();
  } catch {
    // Private mode.
  }
}
