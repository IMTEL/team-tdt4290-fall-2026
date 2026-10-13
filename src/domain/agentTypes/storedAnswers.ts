import { DEFAULT_AGENT_TYPE, getAgentType } from './registry';
import type { AgentTypeDefinition, Answers } from './types';

// Bump this if the answers of a type ever change so much that old saves must be converted.
const VERSION = 1;

/**
 * An agent's answers, together with the agent type they belong to. `customPrompt` is true when
 * the counsellor wrote the system prompt by hand, so the answers must not rebuild it.
 */
export type StoredAnswers = {
  definition: AgentTypeDefinition;
  answers: Answers;
  customPrompt: boolean;
};

/**
 * Turns the answers into the text we save in the RAGdoll agent's description.
 */
export function toStoredDescription(
  definition: AgentTypeDefinition,
  answers: Answers,
  { customPrompt = false }: { customPrompt?: boolean } = {},
): string {
  // The flag is only written when it is set, so agents saved before it existed read as false.
  return JSON.stringify({
    type: definition.id,
    version: VERSION,
    answers,
    ...(customPrompt && { customPrompt: true }),
  });
}

/**
 * Reads the answers back out of an agent's description. Returns null if the description is not
 * something we saved. Answers may be empty if the agent type got new fields after saving.
 */
export function readStoredAnswers(description: string): StoredAnswers | null {
  let saved: unknown;
  try {
    saved = JSON.parse(description);
  } catch {
    return null;
  }
  if (typeof saved !== 'object' || saved === null) return null;

  const { type, answers, customPrompt } = unwrap(saved as Record<string, unknown>);

  const definition = typeof type === 'string' ? getAgentType(type) : undefined;
  if (!definition || typeof answers !== 'object' || answers === null) return null;

  const filled = fillFields(definition, answers as Record<string, unknown>);
  // Some JSON without a single one of our answers in it was not saved by us.
  if (Object.values(filled).every((answer) => answer === '')) return null;

  return { definition, answers: filled, customPrompt: customPrompt === true };
}

/**
 * One answer for each field the agent type has now. A field added after the agent was saved
 * becomes empty, so the counsellor can fill it in. Answers to removed fields are left out.
 */
function fillFields(definition: AgentTypeDefinition, saved: Record<string, unknown>): Answers {
  return Object.fromEntries(
    definition.fields.map(({ key }) => {
      const answer = saved[key];
      return [key, typeof answer === 'string' ? answer : ''];
    }),
  );
}

/**
 * Agents saved before agent types existed have only the answers, with no envelope around them.
 * Those were all interviewers.
 */
function unwrap(saved: Record<string, unknown>): {
  type: unknown;
  answers: unknown;
  customPrompt: unknown;
} {
  if ('type' in saved && 'answers' in saved) {
    return { type: saved.type, answers: saved.answers, customPrompt: saved.customPrompt };
  }
  return { type: DEFAULT_AGENT_TYPE, answers: saved, customPrompt: false };
}
