import {
  type AdvancedSettings,
  DEFAULT_ADVANCED_SETTINGS,
  settingsOf,
} from '@/domain/advancedSettings';
import { readStoredAnswers, toStoredDescription } from '@/domain/agentTypes/storedAnswers';
import type { AgentRole, AgentTypeDefinition, Answers } from '@/domain/agentTypes/types';
import type {
  FullRagdollAgent,
  NewRagdollAgent,
  RagdollAgentSummary,
  RagdollRole,
} from './ragdoll';

// The embedding model every agent uses, named the way RAGdoll knows it.
const EMBEDDING_MODEL = 'idun:Qwen/Qwen3-Embedding-8B';

/**
 * Builds the RAGdoll agent for a new agent from the counsellor's answers and advanced settings.
 * `idunKey` is the project's IDUN key: counsellors have none, so every agent gets ours.
 */
export function toRagdollAgent(
  name: string,
  definition: AgentTypeDefinition,
  answers: Answers,
  idunKey: string,
  settings: AdvancedSettings = DEFAULT_ADVANCED_SETTINGS,
  now: Date = new Date(),
): NewRagdollAgent {
  return {
    ...fromChoices(name, definition, answers, settings, now),
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
 */
export function applyEdit(
  existing: FullRagdollAgent,
  name: string,
  definition: AgentTypeDefinition,
  answers: Answers,
  settings: AdvancedSettings = currentSettings(existing),
  now: Date = new Date(),
): FullRagdollAgent {
  return { ...existing, ...fromChoices(name, definition, answers, settings, now) };
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
  settings: AdvancedSettings,
  now: Date,
) {
  const customPrompt = settings.customPrompt !== null;
  return {
    name,
    description: toStoredDescription(definition, answers, { customPrompt }),
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
  type: string | null;
  typeLabel: string | null;
  stilling: string | null;
  bransje: string | null;
  vanskelighetsgrad: string | null;
};

/** Reads the agent's stored answers so the browser does not have to parse the description. */
export function toAgentListItem(summary: RagdollAgentSummary): AgentListItem {
  const stored = readStoredAnswers(summary.description);
  return {
    // The description stays: the detail and edit pages read the answers from it.
    ...summary,
    type: stored?.definition.id ?? null,
    typeLabel: stored?.definition.label ?? null,
    // Only interviewers have these answers. Other agent types, and answers left empty because the
    // field was added after the agent was saved, get null.
    stilling: stored?.answers.stilling || null,
    bransje: stored?.answers.bransje || null,
    vanskelighetsgrad: stored?.answers.vanskelighetsgrad || null,
  };
}
