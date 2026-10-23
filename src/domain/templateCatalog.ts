import { SECTOR_LABELS, type IndustryTemplate } from '@/data/industry-templates';
import type { AgentTemplate } from '@/data/templates';
import { summarizeProfile, type JobSeekerProfile } from '@/domain/jobSeekerProfile';
import type { LegalTemplate } from '@/domain/legalTemplate';

/** One card on the templates page: a title, one short line, and one sentence. */
export type CatalogItem = {
  id: string;
  title: string;
  line: string;
  detail: string;
  href?: string;
  /** A short label shown as a pill under the title, such as «Følger med appen». */
  chip?: string;
};

function sentence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  return /[.!?…]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

/** The industry's part of its page's address, such as «helse-og-omsorg». */
export function industrySlug(industry: string): string {
  return industry
    .toLowerCase()
    .replace(/[^a-z0-9æøå]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** The industry with this slug and its jobs, or undefined if there is none. */
export function findIndustry(
  templates: IndustryTemplate[],
  slug: string,
): { industry: string; jobs: IndustryTemplate[] } | undefined {
  const jobs = templates.filter((template) => industrySlug(template.industry) === slug);
  return jobs.length > 0 ? { industry: jobs[0].industry, jobs } : undefined;
}

/** The page of one industry. */
export const industryHref = (industry: string) =>
  `/templates/industries/${encodeURIComponent(industrySlug(industry))}`;

/** The page of one job. */
export const jobHref = (id: string) => `/templates/jobs/${encodeURIComponent(id)}`;

/** One card per industry, opening its page. The sentence names the jobs in that industry. */
export function industryCatalog(templates: IndustryTemplate[]): CatalogItem[] {
  const groups = new Map<string, IndustryTemplate[]>();
  for (const template of templates) {
    const jobs = groups.get(template.industry) ?? [];
    jobs.push(template);
    groups.set(template.industry, jobs);
  }

  return [...groups.entries()].map(([industry, jobs]) => {
    const sectors = [...new Set(jobs.map((job) => SECTOR_LABELS[job.sector]))];
    return {
      id: industry,
      title: industry,
      line: sectors.join(' · '),
      detail: sentence(jobs.map((job) => job.title).join(', ')),
      href: industryHref(industry),
    };
  });
}

/**
 * One card per job, opening its page. The line is the industry and whether the employer is public
 * or private.
 */
export function jobCatalog(templates: IndustryTemplate[]): CatalogItem[] {
  return templates.map((template) => ({
    id: template.id,
    title: template.title,
    line: `${template.industry} · ${SECTOR_LABELS[template.sector]}`,
    detail: sentence(template.description),
    href: jobHref(template.id),
  }));
}

/** The counsellor's profiles, as cards that open the profile's page. */
export function profileCatalog(profiles: JobSeekerProfile[]): CatalogItem[] {
  return profiles.map((profile) => ({
    id: profile.id,
    title: profile.label,
    line: summarizeProfile(profile),
    detail: sentence(profile.practiceAreas[0] ?? ''),
    href: `/profiles/${encodeURIComponent(profile.id)}`,
  }));
}

/** Saved interviewer templates, as cards that open the template's page. */
export function savedTemplateCatalog(templates: AgentTemplate[]): CatalogItem[] {
  return templates.map((template) => ({
    id: template.id,
    title: template.title,
    line: template.focus.slice(0, 3).join(' · ') || 'Intervjuermal',
    detail: sentence(template.description),
    href: `/templates/${encodeURIComponent(template.id)}`,
  }));
}

/** Legal templates, as cards that open the template's details. A pill says whose it is. */
export function legalCatalog(templates: LegalTemplate[]): CatalogItem[] {
  return templates.map((template) => ({
    id: template.id,
    title: template.title,
    line: '',
    chip: template.builtIn ? 'Følger med appen' : 'Eget lovverk',
    detail: sentence(template.description),
    href: `/legal-templates/${encodeURIComponent(template.id)}`,
  }));
}
