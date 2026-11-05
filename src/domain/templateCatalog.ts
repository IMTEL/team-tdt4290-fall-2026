import { SECTOR_LABELS, type JobTemplate } from '@/data/job-templates';
import type { AgentTemplate } from '@/data/templates';
import { summarizeProfile, type JobSeekerProfile } from '@/domain/jobSeekerProfile';
import { LEGAL_JURISDICTION_LABELS, type LegalTemplate } from '@/domain/legalTemplate';
import { isBuiltInJob, type IndustryTemplate } from '@/domain/workplaceTemplate';

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

/** The pill on a stillingsmal or bransjemal the counsellor made. */
export const OWN_TEMPLATE_LABEL = 'Egen mal';

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

/** One industry: its name, its stillingsmaler, and the bransjemal if the counsellor made it. */
export type IndustryGroup = {
  industry: string;
  jobs: JobTemplate[];
  entry?: IndustryTemplate;
};

/**
 * Every industry, with its jobs: those named by a stillingsmal first, in their order, then the
 * bransjemaler that have no stillingsmaler yet. Names that differ only in case are one industry.
 */
export function industryGroups(
  templates: JobTemplate[],
  entries: IndustryTemplate[] = [],
): IndustryGroup[] {
  const groups = new Map<string, IndustryGroup>();
  for (const template of templates) {
    const key = industrySlug(template.industry);
    const group = groups.get(key) ?? { industry: template.industry, jobs: [] };
    group.jobs.push(template);
    groups.set(key, group);
  }
  for (const entry of entries) {
    const key = industrySlug(entry.name);
    const group = groups.get(key);
    // The bransjemal's own spelling of the name wins over the stillingsmaler's.
    if (group) groups.set(key, { ...group, industry: entry.name, entry });
    else groups.set(key, { industry: entry.name, jobs: [], entry });
  }
  return [...groups.values()];
}

/** True for an industry that comes with the app: it has a built-in job and no bransjemal. */
export function isBuiltInIndustry(group: IndustryGroup): boolean {
  return !group.entry && group.jobs.some((job) => isBuiltInJob(job.id));
}

/** The industry with this slug and its jobs, or undefined if there is none. */
export function findIndustry(
  templates: JobTemplate[],
  slug: string,
  entries: IndustryTemplate[] = [],
): IndustryGroup | undefined {
  return industryGroups(templates, entries).find((group) => industrySlug(group.industry) === slug);
}

/** The page of one industry. */
export const industryHref = (industry: string) =>
  `/templates/industries/${encodeURIComponent(industrySlug(industry))}`;

/** The page of one job. */
export const jobHref = (id: string) => `/templates/jobs/${encodeURIComponent(id)}`;

/**
 * One card per industry, opening its page. The sentence names the jobs in that industry, or for a
 * bransjemal with none yet, says what the industry is.
 */
export function industryCatalog(
  templates: JobTemplate[],
  entries: IndustryTemplate[] = [],
): CatalogItem[] {
  return industryGroups(templates, entries).map((group) => {
    const sectors = [...new Set(group.jobs.map((job) => SECTOR_LABELS[job.sector]))];
    return {
      id: group.industry,
      title: group.industry,
      // English translation: No job templates yet
      line: sectors.join(' · ') || 'Ingen stillingsmaler ennå',
      detail: sentence(
        group.jobs.length > 0
          ? group.jobs.map((job) => job.title).join(', ')
          : (group.entry?.description ?? ''),
      ),
      href: industryHref(group.industry),
      ...(isBuiltInIndustry(group) ? {} : { chip: OWN_TEMPLATE_LABEL }),
    };
  });
}

/**
 * One card per job, opening its page. The line is the industry and whether the employer is public
 * or private.
 */
export function jobCatalog(templates: JobTemplate[]): CatalogItem[] {
  return templates.map((template) => ({
    id: template.id,
    title: template.title,
    line: `${template.industry} · ${SECTOR_LABELS[template.sector]}`,
    detail: sentence(template.description),
    href: jobHref(template.id),
    ...(isBuiltInJob(template.id) ? {} : { chip: OWN_TEMPLATE_LABEL }),
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
    chip: template.jurisdiction
      ? LEGAL_JURISDICTION_LABELS[template.jurisdiction]
      : template.builtIn
        ? 'Følger med appen'
        : 'Eget lovverk',
    detail: sentence(template.description),
    href: `/legal-templates/${encodeURIComponent(template.id)}`,
  }));
}
