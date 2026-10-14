import { TEMPLATE_LIMITS as LIMITS, type AgentTemplate } from '@/data/templates';
import { getTemplateAgentType } from '@/domain/agentTypes/registry';
import type { NewRagdollTemplate, RagdollTemplate } from './ragdoll';

/** A template the counsellor wants to save. It gets its id from RAGdoll. */
export type NewAgentTemplate = Omit<AgentTemplate, 'id'>;

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text && text.length <= max ? text : null;
}

/**
 * The template from a request body, with spaces trimmed. Null if a field is missing, empty or too
 * long, or the agent type is not one the counsellor can make templates for. Only these fields are
 * kept, so the browser can't store anything else in RAGdoll.
 */
export function parseNewTemplate(body: unknown): NewAgentTemplate | null {
  if (typeof body !== 'object' || body === null) return null;
  const { agentType, title, description, focus, persona } = body as Record<string, unknown>;

  const definition = getTemplateAgentType(agentType);
  if (!definition) return null;

  const cleanTitle = cleanText(title, LIMITS.title);
  const cleanDescription = cleanText(description, LIMITS.description);
  const cleanPersona = cleanText(persona, LIMITS.persona);
  if (!cleanTitle || !cleanDescription || !cleanPersona) return null;

  if (!Array.isArray(focus) || focus.length > LIMITS.focusItems) return null;
  const cleanFocus = focus.map((item) => cleanText(item, LIMITS.focusItem));
  if (cleanFocus.some((item) => item === null)) return null;

  return {
    agentType: definition.id,
    title: cleanTitle,
    description: cleanDescription,
    focus: cleanFocus as string[],
    persona: cleanPersona,
  };
}

/** The template as we store it in RAGdoll. */
export function toRagdollTemplate(template: NewAgentTemplate): NewRagdollTemplate {
  return {
    // RAGdoll's type is the agent type, so templates can be listed by it.
    type: template.agentType,
    name: template.title,
    description: template.description,
    content: { focus: template.focus, persona: template.persona },
  };
}

/**
 * The template from what RAGdoll stores, or null if its type is not an agent type the counsellor
 * can use templates for (other apps' templates have other types), or its content has the wrong
 * shape. Templates saved before agent types had the type "interviewer", the interviewer's id.
 */
export function fromRagdollTemplate(stored: RagdollTemplate): AgentTemplate | null {
  const definition = getTemplateAgentType(stored.type);
  if (!definition) return null;
  const { focus, persona } = stored.content;
  if (typeof persona !== 'string' || !persona) return null;
  if (!Array.isArray(focus) || !focus.every((item) => typeof item === 'string')) return null;

  return {
    id: stored.id,
    agentType: definition.id,
    title: stored.name,
    description: stored.description,
    focus,
    persona,
  };
}
