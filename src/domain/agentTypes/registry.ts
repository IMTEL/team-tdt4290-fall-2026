import { interviewer } from './interviewer';
import type { AgentTypeDefinition, Answers } from './types';

/** Every agent type the app knows. Add a new type here. */
const AGENT_TYPES: Record<string, AgentTypeDefinition> = { interviewer };

/** Agents saved before agent types existed are all interviewers. */
export const DEFAULT_AGENT_TYPE = 'interviewer';

/** The agent type with this id, or undefined if there is none. */
export function getAgentType(id: string): AgentTypeDefinition | undefined {
  return AGENT_TYPES[id];
}

/** Every agent type, in the order they are added above. */
export function listAgentTypes(): AgentTypeDefinition[] {
  return Object.values(AGENT_TYPES);
}

/** True if `value` has an answer for every field of the agent type. */
export function hasAllAnswers(definition: AgentTypeDefinition, value: unknown): value is Answers {
  if (typeof value !== 'object' || value === null) return false;
  const answers = value as Record<string, unknown>;

  return definition.fields.every((field) => isFilledIn(answers[field.key]));
}

/** True if the answer is text with something other than spaces in it. */
function isFilledIn(answer: unknown): boolean {
  return typeof answer === 'string' && answer.trim() !== '';
}
