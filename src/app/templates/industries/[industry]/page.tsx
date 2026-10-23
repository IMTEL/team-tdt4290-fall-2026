import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { BUILT_IN_LABEL, TemplateDetail } from '@/components/templates/TemplateDetail';
import { industryTemplates, SECTOR_LABELS } from '@/data/industry-templates';
import { findIndustry, jobHref } from '@/domain/templateCatalog';

interface IndustryTemplatePageProps {
  params: Promise<{ industry: string }>;
}

/** The industry from the address. A slug never has «%», so decoding it twice does no harm. */
async function industryFrom(params: IndustryTemplatePageProps['params']) {
  const { industry } = await params;
  let slug = industry;
  try {
    slug = decodeURIComponent(industry);
  } catch {
    // Not encoded the way we write it; look it up as it is.
  }
  return findIndustry(industryTemplates, slug);
}

export async function generateMetadata({ params }: IndustryTemplatePageProps): Promise<Metadata> {
  // English translation: Industry template
  return { title: (await industryFrom(params))?.industry ?? 'Bransjemal' };
}

/** One industry and its job templates. They come with the app, so there is nothing to edit. */
export default async function IndustryTemplatePage({ params }: IndustryTemplatePageProps) {
  const found = await industryFrom(params);
  if (!found) notFound();

  const { industry, jobs } = found;
  const sectors = [...new Set(jobs.map((job) => SECTOR_LABELS[job.sector]))];
  const tasks = [...new Set(jobs.flatMap((job) => job.tasks))];

  return (
    <TemplateDetail
      title={industry}
      chip={BUILT_IN_LABEL}
      fields={[
        // English translation: Employer
        { label: 'Arbeidsgiver', text: sectors.join(', ') },
        // English translation: Job templates in the industry
        {
          label: 'Stillingsmaler i bransjen',
          links: jobs.map((job) => ({ href: jobHref(job.id), label: job.title })),
        },
        // English translation: Typical tasks
        { label: 'Typiske oppgaver', chips: tasks },
      ]}
    />
  );
}
