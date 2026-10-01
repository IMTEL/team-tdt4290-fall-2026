import type { Configuration } from '@/domain/configuration';
import { buildPrompt } from '@/domain/interviewerPrompt';
import type { NewRagdollAgent } from './ragdoll';

// The models every interviewer agent uses, named the way RAGdoll knows them.
const LLM_MODEL = 'openai/gpt-oss-120b';
const EMBEDDING_MODEL = 'idun:Qwen/Qwen3-Embedding-8B';

/**
 * Builds the RAGdoll agent for a new interviewer from the counsellor's configuration.
 * `idunKey` is the project's IDUN key: counsellors have none, so every agent gets ours.
 */
export function toRagdollAgent(
  name: string,
  configuration: Configuration,
  idunKey: string,
  now: Date = new Date(),
): NewRagdollAgent {
  return {
    name,
    // RAGdoll has no field for our answers yet, so they are kept here as JSON.
    // The Candidate never reads the agent's description.
    description: JSON.stringify(configuration),
    prompt: buildPrompt(configuration),
    // The Candidate lists an agent's roles as the interviewers to choose from.
    roles: [
      { name, description: configuration.intervjuer, document_access: [], function_access: [] },
    ],
    llm_provider: 'idun',
    llm_model: LLM_MODEL,
    llm_api_key: idunKey,
    embedding_model: EMBEDDING_MODEL,
    // Must be a real key: RAGdoll fails every chat with an empty embedding key.
    embedding_api_key: idunKey,
    // Otherwise every chat turn costs an extra LLM call.
    context_aware_retrieval: false,
    last_updated: now.toISOString(),
  };
}
