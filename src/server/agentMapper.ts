import { toStoredDescription } from '@/domain/agentTypes/storedAnswers';
import type { AgentRole, AgentTypeDefinition, Answers } from '@/domain/agentTypes/types';
import type { FullRagdollAgent, NewRagdollAgent, RagdollRole } from './ragdoll';

// The models every agent uses, named the way RAGdoll knows them.
const LLM_MODEL = 'openai/gpt-oss-120b';
const EMBEDDING_MODEL = 'idun:Qwen/Qwen3-Embedding-8B';

/**
 * Builds the RAGdoll agent for a new agent from the counsellor's answers.
 * `idunKey` is the project's IDUN key: counsellors have none, so every agent gets ours.
 */
export function toRagdollAgent(
  name: string,
  definition: AgentTypeDefinition,
  answers: Answers,
  idunKey: string,
  now: Date = new Date(),
): NewRagdollAgent {
  return {
    ...fromAnswers(name, definition, answers, now),
    llm_provider: 'idun',
    llm_model: LLM_MODEL,
    llm_api_key: idunKey,
    embedding_model: EMBEDDING_MODEL,
    // Must be a real key: RAGdoll fails every chat with an empty embedding key.
    embedding_api_key: idunKey,
    // Otherwise every chat turn costs an extra LLM call.
    context_aware_retrieval: false,
  };
}

/**
 * The existing agent with the counsellor's new name and answers. Every other field is kept as it
 * is, because RAGdoll resets any field we leave out of an update to its default.
 */
export function applyEdit(
  existing: FullRagdollAgent,
  name: string,
  definition: AgentTypeDefinition,
  answers: Answers,
  now: Date = new Date(),
): FullRagdollAgent {
  return { ...existing, ...fromAnswers(name, definition, answers, now) };
}

/** The fields of a RAGdoll agent that come from the counsellor's choices. */
function fromAnswers(name: string, definition: AgentTypeDefinition, answers: Answers, now: Date) {
  return {
    name,
    description: toStoredDescription(definition, answers),
    // The prompt is always rebuilt from the answers, so an edit also gets the newest prompt.
    prompt: definition.buildPrompt(answers),
    roles: definition.buildRoles(name, answers).map(toRagdollRole),
    last_updated: now.toISOString(),
  };
}

/** Our role, with the fields RAGdoll also needs. */
function toRagdollRole(role: AgentRole): RagdollRole {
  return { ...role, document_access: [], function_access: [] };
}
