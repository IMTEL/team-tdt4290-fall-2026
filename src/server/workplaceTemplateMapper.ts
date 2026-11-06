import type { JobTemplate, Sector } from '@/data/job-templates';
import {
  INDUSTRY_TEMPLATE_LIMITS,
  INDUSTRY_TEMPLATE_TYPE,
  JOB_TEMPLATE_LIMITS,
  JOB_TEMPLATE_TYPE,
  type IndustryTemplate,
  type NewIndustryTemplate,
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
export function fromRagdollJobTemplate(stored: RagdollTemplate): JobTemplate | null {
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

/**
 * The bransjemal from a request body, with spaces trimmed. Null if the name or line is missing, or
 * a field is too long. The text for the interviewer may be left out or empty.
 */
export function parseNewIndustryTemplate(body: unknown): NewIndustryTemplate | null {
  if (typeof body !== 'object' || body === null) return null;
  const b = body as Record<string, unknown>;

  const name = cleanText(b.name, INDUSTRY_TEMPLATE_LIMITS.name);
  const description = cleanText(b.description, INDUSTRY_TEMPLATE_LIMITS.description);
  if (!name || !description) return null;

  const context = b.context === undefined ? '' : b.context;
  if (typeof context !== 'string' || context.trim().length > INDUSTRY_TEMPLATE_LIMITS.context) {
    return null;
  }

  return { name, description, context: context.trim() };
}

/** The bransjemal as we store it in RAGdoll's templates. */
export function toRagdollIndustryTemplate(template: NewIndustryTemplate): NewRagdollTemplate {
  return {
    type: INDUSTRY_TEMPLATE_TYPE,
    name: template.name,
    description: template.description,
    content: { context: template.context },
  };
}

/**
 * The bransjemal from what RAGdoll stores, or null if it is a template of another type. One saved
 * before bransjemaler had a text for the interviewer gets an empty one.
 */
export function fromRagdollIndustryTemplate(stored: RagdollTemplate): IndustryTemplate | null {
  if (stored.type !== INDUSTRY_TEMPLATE_TYPE || !stored.name) return null;
  const { context } = stored.content;
  return {
    id: stored.id,
    name: stored.name,
    description: stored.description,
    context: typeof context === 'string' ? context : '',
  };
}

/** Stillingsmaler, for the routes under /api/job-templates. */
export const jobTemplateKind: SavedTemplateKind<NewJobTemplate, JobTemplate> = {
  type: JOB_TEMPLATE_TYPE,
  parse: parseNewJobTemplate,
  toRagdoll: toRagdollJobTemplate,
  fromRagdoll: fromRagdollJobTemplate,
};

/** Bransjemaler, for the routes under /api/industry-templates. */
export const industryTemplateKind: SavedTemplateKind<NewIndustryTemplate, IndustryTemplate> = {
  type: INDUSTRY_TEMPLATE_TYPE,
  parse: parseNewIndustryTemplate,
  toRagdoll: toRagdollIndustryTemplate,
  fromRagdoll: fromRagdollIndustryTemplate,
};
