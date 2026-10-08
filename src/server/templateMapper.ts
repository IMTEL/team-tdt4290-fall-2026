import type { InterviewerTemplate } from '@/data/interviewer-templates';
import type { NewRagdollTemplate, RagdollTemplate } from './ragdoll';

/** Our templates' type in RAGdoll. Other apps' templates have other types. */
export const INTERVIEWER_TEMPLATE_TYPE = 'interviewer';

const LIMITS = { title: 80, description: 300, focusItems: 6, focusItem: 40, persona: 2000 };

/** A template the counsellor wants to save. It gets its id from RAGdoll. */
export type NewInterviewerTemplate = Omit<InterviewerTemplate, 'id'>;

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text && text.length <= max ? text : null;
}

/**
 * The template from a request body, with spaces trimmed. Null if a field is missing, empty or too
 * long. Only these fields are kept, so the browser can't store anything else in RAGdoll.
 */
export function parseNewTemplate(body: unknown): NewInterviewerTemplate | null {
  if (typeof body !== 'object' || body === null) return null;
  const { title, description, focus, persona } = body as Record<string, unknown>;

  const cleanTitle = cleanText(title, LIMITS.title);
  const cleanDescription = cleanText(description, LIMITS.description);
  const cleanPersona = cleanText(persona, LIMITS.persona);
  if (!cleanTitle || !cleanDescription || !cleanPersona) return null;

  if (!Array.isArray(focus) || focus.length > LIMITS.focusItems) return null;
  const cleanFocus = focus.map((item) => cleanText(item, LIMITS.focusItem));
  if (cleanFocus.some((item) => item === null)) return null;

  return {
    title: cleanTitle,
    description: cleanDescription,
    focus: cleanFocus as string[],
    persona: cleanPersona,
  };
}

/** The template as we store it in RAGdoll. */
export function toRagdollTemplate(template: NewInterviewerTemplate): NewRagdollTemplate {
  return {
    type: INTERVIEWER_TEMPLATE_TYPE,
    name: template.title,
    description: template.description,
    content: { focus: template.focus, persona: template.persona },
  };
}

/**
 * The template from what RAGdoll stores, or null if it is not one of our interviewer templates
 * or its content has the wrong shape.
 */
export function fromRagdollTemplate(stored: RagdollTemplate): InterviewerTemplate | null {
  if (stored.type !== INTERVIEWER_TEMPLATE_TYPE) return null;
  const { focus, persona } = stored.content;
  if (typeof persona !== 'string' || !persona) return null;
  if (!Array.isArray(focus) || !focus.every((item) => typeof item === 'string')) return null;

  return {
    id: stored.id,
    title: stored.name,
    description: stored.description,
    focus,
    persona,
  };
}
