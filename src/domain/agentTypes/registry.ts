import { interviewer } from './interviewer';
import type { AgentTypeDefinition, Answers, PlannedAgentType } from './types';

/** Every agent type the app knows. Add a new type here. */
const AGENT_TYPES: Record<string, AgentTypeDefinition> = { interviewer };

/**
 * Types counsellors have asked for that are not made yet. The chooser on /configure shows them as
 * "Kommer snart". Move one to AGENT_TYPES once it has a definition.
 */
const PLANNED_AGENT_TYPES: PlannedAgentType[] = [
  {
    id: 'teacher',
    label: 'Lærer',
    description: 'En samtale med en lærer, for eksempel for å øve til en muntlig prøve.',
  },
  {
    id: 'other',
    label: 'Annen samtalepartner',
    description: 'En annen samtale å øve på, for eksempel med en kunde eller en kollega.',
  },
];

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

/**
 * The agent types the counsellor may set up and make templates for. For now every counsellor may
 * use every type. This is the one place to change if that should depend on the counsellor later;
 * the type chooser, the template form and the template routes all ask here.
 */
export function listAccessibleAgentTypes(): AgentTypeDefinition[] {
  return listAgentTypes();
}

/** The accessible agent types that templates can be made for: those with a template preset. */
export function listTemplateAgentTypes(): AgentTypeDefinition[] {
  return listAccessibleAgentTypes().filter((definition) => definition.presets?.template);
}

/** The accessible agent type with this id that templates can be made for, or undefined. */
export function getTemplateAgentType(id: unknown): AgentTypeDefinition | undefined {
  return listTemplateAgentTypes().find((definition) => definition.id === id);
}

/** The types that are not made yet, without any that has since got a definition. */
export function listPlannedAgentTypes(): PlannedAgentType[] {
  return PLANNED_AGENT_TYPES.filter((planned) => !AGENT_TYPES[planned.id]);
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
