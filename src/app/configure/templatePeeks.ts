import type { IndustryTemplate } from '@/data/industry-templates';
import { paragraphsForTemplate } from '@/data/legal-templates';
import type { AgentTemplate } from '@/data/templates';
import {
  EXPERIENCE_LEVELS,
  practiceChoiceLabel,
  summarizeProfile,
  type JobSeekerProfile,
} from '@/domain/jobSeekerProfile';
import { LEGAL_JURISDICTION_LABELS, type LegalTemplate } from '@/domain/legalTemplate';
import type { IndustryTemplateEntry } from '@/domain/workplaceTemplate';

/** Same sentinel as StillingStep.NO_TEMPLATE. Kept here so this file does not import the step. */
const NO_TEMPLATE = 'ingen';

type WorkplacePeekInput = {
  templateId: string | null;
  industry: string;
};

export type TemplatePeek = {
  id: string;
  /** Stillingsmal, Bransje, Intervjuermal, Jobbsøkermal or Lovverk. */
  kind: string;
  title: string;
  /** One line shown on the bubble. */
  summary: string;
  /** The full contents, shown when the bubble opens. */
  details: { label: string; value: string; href?: string }[];
};

/** Which bubbles belong on which wizard section, so they do not follow the counsellor to the next. */
const KINDS_ON_STEP: Record<number, readonly string[]> = {
  0: ['Stillingsmal', 'Bransje'],
  1: ['Intervjuermal', 'Lovverk'],
  2: ['Jobbsøkermal'],
};

function lines(
  items: { label: string; value: string | undefined | null; href?: string }[],
): { label: string; value: string; href?: string }[] {
  return items
    .map((item) => ({
      label: item.label,
      value: (item.value ?? '').trim(),
      ...(item.href ? { href: item.href } : {}),
    }))
    .filter((item) => item.value !== '');
}

export function jobTemplatePeek(template: IndustryTemplate): TemplatePeek {
  return {
    id: `job-${template.id}`,
    kind: 'Stillingsmal',
    title: template.title,
    summary: template.description,
    details: lines([
      { label: 'Om stillingen', value: template.description },
      { label: 'Typiske oppgaver', value: template.tasks.join(', ') },
      { label: 'Dette får intervjueren vite', value: template.jobDescription },
    ]),
  };
}

export function industryTemplatePeek(entry: IndustryTemplateEntry): TemplatePeek | null {
  const details = lines([
    { label: 'Om bransjen', value: entry.description },
    { label: 'Dette får intervjueren vite', value: entry.context },
  ]);
  if (details.length === 0) return null;
  return {
    id: `industry-${entry.id}`,
    kind: 'Bransje',
    title: entry.name,
    summary: entry.description || entry.context,
    details,
  };
}

/** A bubble for the chosen industry, even when there is no saved bransjemal. */
export function industryChoicePeek(
  name: string,
  jobs: IndustryTemplate[],
  entry?: IndustryTemplateEntry,
): TemplatePeek {
  const saved = entry ? industryTemplatePeek(entry) : null;
  if (saved) return saved;
  const related = jobs
    .filter((job) => job.industry.toLowerCase() === name.toLowerCase())
    .map((job) => job.title);
  return {
    id: `industry-${name.trim().toLowerCase()}`,
    kind: 'Bransje',
    title: name,
    summary: 'Intervjueren stiller spørsmål som passer i denne bransjen.',
    details: lines([
      { label: 'Bransje', value: name },
      { label: 'Stillinger i bransjen', value: related.join(', ') },
    ]),
  };
}

export function interviewerTemplatePeek(template: AgentTemplate): TemplatePeek {
  return {
    id: `interviewer-${template.id}`,
    kind: 'Intervjuermal',
    title: template.title,
    summary: template.description,
    details: lines([
      { label: 'Om malen', value: template.description },
      { label: 'Fokus', value: template.focus.join(', ') },
      { label: 'Rolle og stil', value: template.persona },
    ]),
  };
}

export function jobSeekerTemplatePeek(profile: JobSeekerProfile): TemplatePeek {
  const experience = [
    profile.experienceLevel && EXPERIENCE_LEVELS[profile.experienceLevel],
    profile.workExperience,
  ]
    .filter(Boolean)
    .join(', ');
  return {
    id: `profile-${profile.id}`,
    kind: 'Jobbsøkermal',
    title: profile.label,
    summary: summarizeProfile(profile) || 'Ingen alder eller erfaring er fylt inn.',
    details: lines([
      {
        label: 'Alder',
        value: profile.ageRange ? `${profile.ageRange.replace('-', '–')} år` : '',
      },
      { label: 'Erfaring', value: experience },
      { label: 'Utdanning', value: profile.education },
      { label: 'Språk', value: profile.languages.join(', ') },
      {
        label: 'Øve på',
        value: profile.practiceAreas.map(practiceChoiceLabel).join(', '),
      },
    ]),
  };
}

export function legalTemplatePeek(template: LegalTemplate): TemplatePeek {
  const paragraphs = paragraphsForTemplate(template);
  const details =
    paragraphs.length > 0
      ? lines([
          { label: 'Om', value: template.description },
          ...paragraphs.map((paragraph) => ({
            label: paragraph.title,
            value: paragraph.text,
            href: paragraph.sourceUrl,
          })),
        ])
      : lines([
          { label: 'Om', value: template.description },
          { label: 'Hva intervjueren følger', value: template.text },
          {
            label: 'Område',
            value: template.jurisdiction && LEGAL_JURISDICTION_LABELS[template.jurisdiction],
          },
          {
            label: 'Kilde',
            value: template.sourceUrl ? 'Se kilden' : '',
            href: template.sourceUrl,
          },
        ]);
  return {
    id: `legal-${template.id}`,
    kind: 'Lovverk',
    title: template.title,
    summary: template.description,
    details,
  };
}

/** The templates already chosen in the wizard, in the order of the sections. */
export function wizardTemplatePeeks({
  workplace,
  jobTemplates,
  industryTemplates,
  interviewer,
  profile,
  legalTemplates,
}: {
  workplace: WorkplacePeekInput;
  jobTemplates: IndustryTemplate[];
  industryTemplates: IndustryTemplateEntry[];
  interviewer: AgentTemplate | null;
  profile: JobSeekerProfile | null;
  legalTemplates: LegalTemplate[];
}): TemplatePeek[] {
  const peeks: TemplatePeek[] = [];
  const job =
    workplace.templateId && workplace.templateId !== NO_TEMPLATE
      ? jobTemplates.find((item) => item.id === workplace.templateId)
      : undefined;
  if (job) peeks.push(jobTemplatePeek(job));

  if (workplace.industry && workplace.industry !== NO_TEMPLATE) {
    const industry = industryTemplates.find(
      (item) => item.name.toLowerCase() === workplace.industry.toLowerCase(),
    );
    peeks.push(industryChoicePeek(workplace.industry, jobTemplates, industry));
  }

  if (interviewer) peeks.push(interviewerTemplatePeek(interviewer));
  for (const legal of legalTemplates) peeks.push(legalTemplatePeek(legal));
  if (profile) peeks.push(jobSeekerTemplatePeek(profile));
  return peeks;
}

/** The bubbles that belong on the open section. Earlier choices stay off the next page. */
export function peeksOnStep(peeks: TemplatePeek[], step: number): TemplatePeek[] {
  const kinds = KINDS_ON_STEP[step];
  return kinds ? peeks.filter((peek) => kinds.includes(peek.kind)) : [];
}

/** The first bubble on this section, so Se hele can sit before Tilbake. */
export function peekForStep(peeks: TemplatePeek[], step: number): TemplatePeek | undefined {
  return peeksOnStep(peeks, step)[0];
}
