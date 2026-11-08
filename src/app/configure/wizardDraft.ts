import type { AgentTemplate } from '@/data/templates';
import { DEFAULT_MAX_TOKENS, DEFAULT_TEMPERATURE } from '@/domain/advancedSettings';
import type { InterviewSettings } from './SettingsStep';
import type { Workplace } from './StillingStep';

const STORAGE_KEY = 'kfi-configure-draft';
const VERSION = 2;
const STORE_VERSION = 3;
const LEGACY_ID = 'legacy';

const EMPTY_DRAFTS: WizardDraft[] = [];

const draftListeners = new Set<() => void>();

/** Cached so useSyncExternalStore getSnapshot returns a stable reference between writes. */
let cachedRaw: string | null | undefined;
let cachedDrafts: WizardDraft[] = EMPTY_DRAFTS;

/** Lets the agents list refresh when this browser’s drafts are written or cleared. */
export function subscribeWizardDraft(onStoreChange: () => void): () => void {
  draftListeners.add(onStoreChange);
  return () => {
    draftListeners.delete(onStoreChange);
  };
}

function notifyDraftListeners() {
  for (const listener of draftListeners) listener();
}

/**
 * What the counsellor has filled in so far for a new interviewer. Kept in the browser so leaving
 * mid-wizard does not lose the work. Several drafts can sit side by side.
 */
export type WizardDraft = {
  version: typeof VERSION;
  /** Distinguishes this utkast from others in the same browser. */
  id: string;
  /** When the draft was last written, newest first on the agents page. */
  updatedAt?: number;
  agentTypeId: string;
  wizardStep: number;
  furthestStep: number;
  /** True after the counsellor has opened AI-innstillinger, so Tilbake from Fullføre can return there. */
  openedAiSettings?: boolean;
  workplace: Workplace;
  /** False until the counsellor picks a template or continues without one. */
  hasTemplateChoice: boolean;
  /** The chosen template, or null for «Fortsett uten mal». */
  template: AgentTemplate | null;
  profileId: string;
  practiceAreas: string[];
  /** The chosen legal templates' ids. Missing in drafts from before legal templates. */
  legalIds?: string[];
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
    // An emptied number field is NaN, which JSON stores as null. Max tokens are missing in drafts
    // from before that setting. readWizardDraft fills in the defaults for both.
    (value.temperature === null || typeof value.temperature === 'number') &&
    (value.maxTokens === undefined ||
      value.maxTokens === null ||
      typeof value.maxTokens === 'number') &&
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

/** Drafts from before AI-innstillinger used 4 for Fullføre. */
function migrateDraft(draft: WizardDraft): WizardDraft {
  const withId = draft.id ? draft : { ...draft, id: LEGACY_ID };
  if (draft.version === VERSION) return withId;
  return {
    ...withId,
    version: VERSION,
    wizardStep: draft.wizardStep >= 4 ? draft.wizardStep + 1 : draft.wizardStep,
    furthestStep: draft.furthestStep >= 4 ? draft.furthestStep + 1 : draft.furthestStep,
  };
}

function isDraft(value: unknown): value is WizardDraft {
  if (!isRecord(value) || (value.version !== 1 && value.version !== VERSION)) return false;
  return (
    (value.id === undefined || typeof value.id === 'string') &&
    (value.updatedAt === undefined || typeof value.updatedAt === 'number') &&
    typeof value.agentTypeId === 'string' &&
    typeof value.wizardStep === 'number' &&
    typeof value.furthestStep === 'number' &&
    (value.openedAiSettings === undefined || typeof value.openedAiSettings === 'boolean') &&
    isWorkplace(value.workplace) &&
    typeof value.hasTemplateChoice === 'boolean' &&
    (value.template === null || isTemplate(value.template)) &&
    typeof value.profileId === 'string' &&
    Array.isArray(value.practiceAreas) &&
    value.practiceAreas.every((item) => typeof item === 'string') &&
    (value.legalIds === undefined ||
      (Array.isArray(value.legalIds) &&
        value.legalIds.every((item) => typeof item === 'string'))) &&
    typeof value.otherOpen === 'boolean' &&
    typeof value.otherPractice === 'string' &&
    isSettings(value.settings) &&
    (value.avatar === null || typeof value.avatar === 'string') &&
    typeof value.nameEdited === 'boolean' &&
    typeof value.agentName === 'string' &&
    typeof value.presetsDone === 'boolean'
  );
}

function isStore(value: unknown): value is { version: 3; drafts: unknown[] } {
  return isRecord(value) && value.version === STORE_VERSION && Array.isArray(value.drafts);
}

function parseDrafts(raw: string): WizardDraft[] {
  const parsed: unknown = JSON.parse(raw);
  if (isDraft(parsed)) return [withDefaults(migrateDraft(parsed))];
  if (isStore(parsed)) {
    return parsed.drafts.filter(isDraft).map((draft) => withDefaults(migrateDraft(draft)));
  }
  return [];
}

function saveDrafts(drafts: WizardDraft[]): void {
  if (drafts.length === 0) {
    localStorage.removeItem(STORAGE_KEY);
    cachedRaw = null;
    cachedDrafts = EMPTY_DRAFTS;
  } else {
    const raw = JSON.stringify({ version: STORE_VERSION, drafts });
    localStorage.setItem(STORAGE_KEY, raw);
    cachedRaw = raw;
    // The same drafts a later read would parse, so an emptied number field reads as its default.
    cachedDrafts = drafts.map(withDefaults);
  }
  notifyDraftListeners();
}

/** A new id for an utkast started from «Ny agent». */
export function createWizardDraftId(): string {
  return crypto.randomUUID();
}

/** The unfinished interviewer drafts in this browser, newest first. */
export function readWizardDrafts(): WizardDraft[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRaw) return cachedDrafts;
    cachedRaw = raw;
    if (!raw) {
      cachedDrafts = EMPTY_DRAFTS;
      return cachedDrafts;
    }
    const drafts = parseDrafts(raw);
    cachedDrafts = drafts.length === 0 ? EMPTY_DRAFTS : drafts;
    return cachedDrafts;
  } catch {
    cachedRaw = undefined;
    cachedDrafts = EMPTY_DRAFTS;
    return cachedDrafts;
  }
}

/** A number setting with a value. An emptied field is NaN in memory and null once stored. */
function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * The draft with the default for a number setting that has no value: the field was empty when the
 * draft was saved, or the draft is from before the setting existed.
 */
function withDefaults(draft: WizardDraft): WizardDraft {
  const { temperature, maxTokens } = draft.settings;
  if (isNumber(temperature) && isNumber(maxTokens)) return draft;
  return {
    ...draft,
    settings: {
      ...draft.settings,
      temperature: isNumber(temperature) ? temperature : DEFAULT_TEMPERATURE,
      maxTokens: isNumber(maxTokens) ? maxTokens : DEFAULT_MAX_TOKENS,
    },
  };
}

/** One draft by id, or the newest when `id` is omitted. */
export function readWizardDraft(id?: string): WizardDraft | null {
  const drafts = readWizardDrafts();
  if (id) return drafts.find((draft) => draft.id === id) ?? null;
  return drafts[0] ?? null;
}

/** Remembers this wizard. Other utkast in the same browser are kept. */
export function writeWizardDraft(draft: WizardDraft): void {
  try {
    const next = [
      { ...draft, updatedAt: Date.now() },
      ...readWizardDrafts().filter((item) => item.id !== draft.id),
    ];
    saveDrafts(next);
  } catch {
    // Private mode, or storage full.
  }
}

/**
 * Drops one utkast, or every draft when `id` is omitted (after the last one is deleted, or when
 * the counsellor abandons the only wizard).
 */
export function clearWizardDraft(id?: string): void {
  try {
    if (!id) {
      localStorage.removeItem(STORAGE_KEY);
      cachedRaw = null;
      cachedDrafts = EMPTY_DRAFTS;
      notifyDraftListeners();
      return;
    }
    saveDrafts(readWizardDrafts().filter((draft) => draft.id !== id));
  } catch {
    // Private mode.
  }
}

/** Opens the wizard for this utkast, optionally on a named step. */
export function configureDraftHref(draftId: string, step?: string): string {
  const href = `/configure?type=interviewer&draft=${encodeURIComponent(draftId)}`;
  return step ? `${href}&step=${step}` : href;
}
