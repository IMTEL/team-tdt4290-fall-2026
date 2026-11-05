import {
  LEGAL_TEMPLATE_LIMITS as LIMITS,
  LEGAL_TEMPLATE_TYPE,
  type LegalTemplate,
  type NewLegalTemplate,
} from '@/domain/legalTemplate';
import type { NewRagdollTemplate, RagdollTemplate } from './ragdoll';

/** The text without spaces at the ends, or null if it is empty, not text or too long. */
function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text && text.length <= max ? text : null;
}

/**
 * The legal template from a request body, with spaces trimmed. Null if a field is missing, empty
 * or too long. Only these fields are kept, so the browser can't store anything else in RAGdoll.
 */
export function parseNewLegalTemplate(body: unknown): NewLegalTemplate | null {
  if (typeof body !== 'object' || body === null) return null;
  const b = body as Record<string, unknown>;

  const title = cleanText(b.title, LIMITS.title);
  const description = cleanText(b.description, LIMITS.description);
  const text = cleanText(b.text, LIMITS.text);
  if (!title || !description || !text) return null;

  const sourceIds = parseSourceIds(b.sourceIds);
  return sourceIds.length > 0
    ? { title, description, text, sourceIds }
    : { title, description, text };
}

function parseSourceIds(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > LIMITS.perAgent) return [];
  const ids = value.filter((item): item is string => typeof item === 'string' && item !== '');
  return new Set(ids).size === ids.length ? ids : [];
}

/** The legal template as we store it in RAGdoll's templates. */
export function toRagdollLegalTemplate(template: NewLegalTemplate): NewRagdollTemplate {
  return {
    type: LEGAL_TEMPLATE_TYPE,
    name: template.title,
    description: template.description,
    content: {
      text: template.text,
      ...(template.sourceIds?.length ? { sourceIds: template.sourceIds } : {}),
    },
  };
}

/**
 * The legal template from what RAGdoll stores, or null if it is a template of another type (an
 * agent type's, or another app's) or its content has the wrong shape.
 */
export function fromRagdollLegalTemplate(stored: RagdollTemplate): LegalTemplate | null {
  if (stored.type !== LEGAL_TEMPLATE_TYPE) return null;
  const { text } = stored.content;
  if (typeof text !== 'string' || !text) return null;

  const sourceIds = parseSourceIds(stored.content.sourceIds);
  return {
    id: stored.id,
    title: stored.name,
    description: stored.description,
    text,
    builtIn: false,
    ...(sourceIds.length > 0 ? { sourceIds } : {}),
  };
}
