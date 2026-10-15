import { interviewerTemplates } from './interviewer-templates';

/**
 * A ready-made text for one kind of agent: it fills in the field its agent type's template preset
 * names, such as the interviewer of an interviewer. Built in, or saved by a counsellor in RAGdoll.
 */
export interface AgentTemplate {
  id: string;
  /** The agent type the template is for, e.g. "interviewer". RAGdoll stores it as the type. */
  agentType: string;
  /** The template's name, shown on the card, e.g. the interviewer's role. */
  title: string;
  /** One line for the counsellor about what the template is like. */
  description: string;
  /** What the agent focuses on, shown as tags on the card. */
  focus: string[];
  /** Becomes the answer to the template's field. Written as the counsellor would say it. */
  persona: string;
}

/** The longest each field of a saved template may be. The server checks them too. */
export const TEMPLATE_LIMITS = {
  title: 80,
  description: 300,
  focusItems: 6,
  focusItem: 40,
  persona: 2000,
} as const;

// Every built-in template. Only interviewers have any so far.
const BUILT_IN: AgentTemplate[] = [...interviewerTemplates];

/** The built-in templates for one agent type, shown before the counsellor's own. */
export function builtInTemplates(agentType: string): AgentTemplate[] {
  return BUILT_IN.filter((template) => template.agentType === agentType);
}

/** The built-in template with this id, or undefined if there is none. */
export function findBuiltInTemplate(id: string): AgentTemplate | undefined {
  return BUILT_IN.find((template) => template.id === id);
}
