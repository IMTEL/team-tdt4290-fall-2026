// Stillingsmaler and bransjemaler the counsellor makes. The built-in ones are in
// data/industry-templates.ts; the counsellor's own are saved in RAGdoll's templates with their own
// types, and are offered next to the built-in ones on /templates and on /configure.

import { industryTemplates, type IndustryTemplate } from '@/data/industry-templates';

/** RAGdoll's template type for stillingsmaler. Kept apart from the agent types' templates. */
export const JOB_TEMPLATE_TYPE = 'job-template';

/** RAGdoll's template type for bransjemaler. */
export const INDUSTRY_TEMPLATE_TYPE = 'industry-template';

/** The longest each field may be, and how many typical tasks a stillingsmal may have. */
export const JOB_TEMPLATE_LIMITS = {
  title: 100,
  industry: 100,
  description: 300,
  task: 40,
  tasks: 8,
  jobDescription: 2000,
} as const;

export const INDUSTRY_TEMPLATE_LIMITS = {
  name: 100,
  description: 300,
} as const;

/** A stillingsmal as the counsellor writes it. The saved one has the same shape as a built-in. */
export type NewJobTemplate = Omit<IndustryTemplate, 'id'>;

/** A bransje the counsellor has added, so it can be chosen before it has any stillingsmaler. */
export type IndustryTemplateEntry = {
  id: string;
  name: string;
  /** One line about the industry. Shown on the card and the industry's page. */
  description: string;
};

export type NewIndustryTemplate = Omit<IndustryTemplateEntry, 'id'>;

/** True for a stillingsmal that comes with the app. They can't be changed or deleted. */
export function isBuiltInJob(id: string): boolean {
  return industryTemplates.some((template) => template.id === id);
}

/**
 * Every industry name, in the order the counsellor sees them: those of the stillingsmaler first,
 * then the bransjemaler that have none yet. Each name once, whatever its case.
 */
export function industryNames(
  jobs: IndustryTemplate[],
  industries: IndustryTemplateEntry[],
): string[] {
  const names = new Map<string, string>();
  for (const name of [...jobs.map((job) => job.industry), ...industries.map((i) => i.name)]) {
    const key = name.trim().toLowerCase();
    if (key && !names.has(key)) names.set(key, name.trim());
  }
  return [...names.values()];
}

/** True if another industry already has this name, whatever its case. */
export function industryNameTaken(name: string, existing: string[]): boolean {
  const key = name.trim().toLowerCase();
  return existing.some((other) => other.trim().toLowerCase() === key);
}
