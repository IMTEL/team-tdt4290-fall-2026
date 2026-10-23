import { SECTOR_LABELS, type IndustryTemplate } from '@/data/industry-templates';
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

/** One card per industry. The sentence names the jobs in that industry. */
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
    };
  });
}

/** One card per job. The line is the industry and whether the employer is public or private. */
export function jobCatalog(templates: IndustryTemplate[]): CatalogItem[] {
  return templates.map((template) => ({
    id: template.id,
    title: template.title,
    line: `${template.industry} · ${SECTOR_LABELS[template.sector]}`,
    detail: sentence(template.description),
  }));
}

/** The counsellor's profiles, as cards that open the profile for editing. */
export function profileCatalog(profiles: JobSeekerProfile[]): CatalogItem[] {
  return profiles.map((profile) => ({
    id: profile.id,
    title: profile.label,
    line: summarizeProfile(profile),
    detail: sentence(profile.practiceAreas[0] ?? ''),
    href: `/profiles/${encodeURIComponent(profile.id)}/edit`,
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
