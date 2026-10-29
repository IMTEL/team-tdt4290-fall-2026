// Stillingsmaler the counsellor makes. The built-in ones are in data/industry-templates.ts; the
// counsellor's own are saved in RAGdoll's templates with their own type, and are offered next to
// the built-in ones on /templates and on /configure.

import { industryTemplates, type IndustryTemplate } from '@/data/industry-templates';

/** RAGdoll's template type for stillingsmaler. Kept apart from the agent types' templates. */
export const JOB_TEMPLATE_TYPE = 'job-template';

/** The longest each field may be, and how many typical tasks a stillingsmal may have. */
export const JOB_TEMPLATE_LIMITS = {
  title: 100,
  industry: 100,
  description: 300,
  task: 40,
  tasks: 8,
  jobDescription: 2000,
} as const;

/** A stillingsmal as the counsellor writes it. The saved one has the same shape as a built-in. */
export type NewJobTemplate = Omit<IndustryTemplate, 'id'>;

/** True for a stillingsmal that comes with the app. They can't be changed or deleted. */
export function isBuiltInJob(id: string): boolean {
  return industryTemplates.some((template) => template.id === id);
}

/** Every industry the stillingsmaler name, in their order. Each name once, whatever its case. */
export function industryNames(jobs: IndustryTemplate[]): string[] {
  const names = new Map<string, string>();
  for (const name of jobs.map((job) => job.industry)) {
    const key = name.trim().toLowerCase();
    if (key && !names.has(key)) names.set(key, name.trim());
  }
  return [...names.values()];
}
