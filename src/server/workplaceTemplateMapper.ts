import type { IndustryTemplate, Sector } from '@/data/industry-templates';
import {
  JOB_TEMPLATE_LIMITS,
  JOB_TEMPLATE_TYPE,
  type NewJobTemplate,
} from '@/domain/workplaceTemplate';
import type { NewRagdollTemplate, RagdollTemplate } from './ragdoll';
import type { SavedTemplateKind } from './savedTemplateRoutes';

/** The text without spaces at the ends, or null if it is empty, not text or too long. */
function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text && text.length <= max ? text : null;
}

function isSector(value: unknown): value is Sector {
  return value === 'offentlig' || value === 'privat';
}

/** The tasks with spaces trimmed and empty ones left out, or null if one is not text or too long. */
function cleanTasks(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length > JOB_TEMPLATE_LIMITS.tasks) return null;
  const tasks: string[] = [];
  for (const task of value) {
    if (typeof task !== 'string') return null;
    const text = task.trim();
    if (text.length > JOB_TEMPLATE_LIMITS.task) return null;
    if (text) tasks.push(text);
  }
  return tasks;
}

/**
 * The stillingsmal from a request body, with spaces trimmed. Null if a field is missing, empty or
 * too long. Only these fields are kept, so the browser can't store anything else in RAGdoll.
 */
export function parseNewJobTemplate(body: unknown): NewJobTemplate | null {
  if (typeof body !== 'object' || body === null) return null;
  const b = body as Record<string, unknown>;

  const title = cleanText(b.title, JOB_TEMPLATE_LIMITS.title);
  const industry = cleanText(b.industry, JOB_TEMPLATE_LIMITS.industry);
  const description = cleanText(b.description, JOB_TEMPLATE_LIMITS.description);
  const jobDescription = cleanText(b.jobDescription, JOB_TEMPLATE_LIMITS.jobDescription);
  const tasks = cleanTasks(b.tasks);
  if (!title || !industry || !description || !jobDescription || !tasks || !isSector(b.sector)) {
    return null;
  }

  return { title, industry, sector: b.sector, description, tasks, jobDescription };
}

/** The stillingsmal as we store it in RAGdoll's templates. */
export function toRagdollJobTemplate(template: NewJobTemplate): NewRagdollTemplate {
  return {
    type: JOB_TEMPLATE_TYPE,
    name: template.title,
    description: template.description,
    content: {
      industry: template.industry,
      sector: template.sector,
      tasks: template.tasks,
      jobDescription: template.jobDescription,
    },
  };
}

/**
 * The stillingsmal from what RAGdoll stores, or null if it is a template of another type or its
 * content has the wrong shape.
 */
export function fromRagdollJobTemplate(stored: RagdollTemplate): IndustryTemplate | null {
  if (stored.type !== JOB_TEMPLATE_TYPE) return null;
  const { industry, sector, tasks, jobDescription } = stored.content;
  if (typeof industry !== 'string' || !industry || !isSector(sector)) return null;
  if (typeof jobDescription !== 'string' || !jobDescription) return null;
  if (!Array.isArray(tasks) || !tasks.every((task) => typeof task === 'string')) return null;

  return {
    id: stored.id,
    title: stored.name,
    industry,
    sector,
    description: stored.description,
    tasks,
    jobDescription,
  };
}

/** Stillingsmaler, for the routes under /api/job-templates. */
export const jobTemplateKind: SavedTemplateKind<NewJobTemplate, IndustryTemplate> = {
  type: JOB_TEMPLATE_TYPE,
  parse: parseNewJobTemplate,
  toRagdoll: toRagdollJobTemplate,
  fromRagdoll: fromRagdollJobTemplate,
};
