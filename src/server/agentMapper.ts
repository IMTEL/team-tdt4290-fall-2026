import { interviewerTemplates } from '@/data/interviewer-templates';
import {
  type AdvancedSettings,
  DEFAULT_ADVANCED_SETTINGS,
  settingsOf,
} from '@/domain/advancedSettings';
import { readStoredAnswers, toStoredDescription } from '@/domain/agentTypes/storedAnswers';
import type {
  AgentRole,
  AgentTypeDefinition,
  AnswerSources,
  Answers,
} from '@/domain/agentTypes/types';
import type {
  FullRagdollAgent,
  NewRagdollAgent,
  RagdollAgentSummary,
  RagdollRole,
} from './ragdoll';

// The embedding model every agent uses, named the way RAGdoll knows it.
const EMBEDDING_MODEL = 'idun:Qwen/Qwen3-Embedding-8B';

/**
 * Builds the RAGdoll agent for a new agent from the counsellor's answers, the sources of those
 * that came from a template or profile, and the advanced settings.
 * `idunKey` is the project's IDUN key: counsellors have none, so every agent gets ours.
 * `avatar` is the id of one of our avatars, or null for the default image.
 */
export function toRagdollAgent(
  name: string,
  definition: AgentTypeDefinition,
  answers: Answers,
  idunKey: string,
  sources: AnswerSources = {},
  settings: AdvancedSettings = DEFAULT_ADVANCED_SETTINGS,
  now: Date = new Date(),
  avatar: string | null = null,
): NewRagdollAgent {
  return {
    ...fromChoices(name, definition, answers, sources, settings, avatar, now),
    llm_provider: 'idun',
    llm_api_key: idunKey,
    embedding_model: EMBEDDING_MODEL,
    // Must be a real key: RAGdoll fails every chat with an empty embedding key.
    embedding_api_key: idunKey,
    // Otherwise every chat turn costs an extra LLM call.
    context_aware_retrieval: false,
  };
}

/**
 * The existing agent with the counsellor's new name, answers and advanced settings. Every other
 * field is kept as it is, because RAGdoll resets any field we leave out of an update to its
 * default. Without new settings, the agent keeps its model, temperature and hand-written prompt.
 * Without a new avatar it keeps its avatar, and null gives it the default image.
 */
export function applyEdit(
  existing: FullRagdollAgent,
  name: string,
  definition: AgentTypeDefinition,
  answers: Answers,
  sources: AnswerSources = {},
  settings: AdvancedSettings = currentSettings(existing),
  now: Date = new Date(),
  avatar: string | null = currentAvatar(existing),
): FullRagdollAgent {
  return { ...existing, ...fromChoices(name, definition, answers, sources, settings, avatar, now) };
}

/** The avatar a saved agent has now: the id of one of our avatars, or null for the default. */
export function currentAvatar(agent: FullRagdollAgent): string | null {
  return readStoredAnswers(agent.description)?.avatar ?? null;
}

/** The advanced settings a saved agent has now. */
export function currentSettings(agent: FullRagdollAgent): AdvancedSettings {
  return settingsOf(
    {
      model: agent.llm_model,
      temperature: typeof agent.llm_temperature === 'number' ? agent.llm_temperature : null,
      prompt: agent.prompt,
    },
    readStoredAnswers(agent.description)?.customPrompt ?? false,
  );
}

/** The fields of a RAGdoll agent that come from the counsellor's choices. */
function fromChoices(
  name: string,
  definition: AgentTypeDefinition,
  answers: Answers,
  sources: AnswerSources,
  settings: AdvancedSettings,
  avatar: string | null,
  now: Date,
) {
  const customPrompt = settings.customPrompt !== null;
  return {
    name,
    description: toStoredDescription(definition, answers, sources, { customPrompt, avatar }),
    // Unless the counsellor wrote it by hand, the prompt is rebuilt from the answers, so an edit
    // also gets the newest prompt.
    prompt: settings.customPrompt ?? definition.buildPrompt(answers),
    roles: definition.buildRoles(name, answers).map(toRagdollRole),
    llm_model: settings.model,
    llm_temperature: settings.temperature,
    last_updated: now.toISOString(),
  };
}

/** Our role, with the fields RAGdoll also needs. */
function toRagdollRole(role: AgentRole): RagdollRole {
  return { ...role, document_access: [], function_access: [] };
}

/**
 * An agent as the agent list gets it: the summary, plus what the cards and the filter need from
 * the stored answers. A field is null if the description is not something we saved, or if the
 * answer is missing.
 */
export type AgentListItem = RagdollAgentSummary & {
  /** The id of the agent's avatar, or null for the default image. */
  avatar: string | null;
  type: string | null;
  typeLabel: string | null;
  stilling: string | null;
  bransje: string | null;
  vanskelighetsgrad: string | null;
  intervjuer: string | null;
  intervjutype: string | null;
  intervjuerMal: string | null;
};

/** Reads the agent's stored answers so the browser does not have to parse the description. */
export function toAgentListItem(summary: RagdollAgentSummary): AgentListItem {
  const stored = readStoredAnswers(summary.description);
  const template = interviewerTemplate(stored?.sources.intervjuer);
  return {
    // The description stays: the detail and edit pages read the answers from it.
    ...summary,
    avatar: stored?.avatar ?? null,
    type: stored?.definition.id ?? null,
    typeLabel: stored?.definition.label ?? null,
    // Only interviewers have these answers. Other agent types, and answers left empty because the
    // field was added after the agent was saved, get null.
    stilling: stored?.answers.stilling || null,
    bransje: stored?.answers.bransje || null,
    vanskelighetsgrad: stored?.answers.vanskelighetsgrad || null,
    intervjuer: stored?.answers.intervjuer || null,
    intervjutype: stored?.answers.intervjutype || null,
    intervjuerMal: template?.title ?? null,
  };
}

/** The built-in interviewer template an answer came from, when it did. */
function interviewerTemplate(source: AnswerSources[string] | undefined) {
  if (source?.kind !== 'template') return undefined;
  return interviewerTemplates.find((template) => template.id === source.id);
}
