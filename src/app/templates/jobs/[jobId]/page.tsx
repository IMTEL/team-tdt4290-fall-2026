import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { BUILT_IN_LABEL, TemplateDetail } from '@/components/templates/TemplateDetail';
import { findIndustryTemplate, SECTOR_LABELS } from '@/data/industry-templates';
import { industryHref } from '@/domain/templateCatalog';

interface JobTemplatePageProps {
  params: Promise<{ jobId: string }>;
}

export async function generateMetadata({ params }: JobTemplatePageProps): Promise<Metadata> {
  const { jobId } = await params;
  // English translation: Job template
  return { title: findIndustryTemplate(jobId)?.title ?? 'Stillingsmal' };
}

/**
 * One job template. They all come with the app, so there is nothing to edit or delete. The job
 * description is what the interviewer gets in its Stilling answer.
 */
export default async function JobTemplatePage({ params }: JobTemplatePageProps) {
  const { jobId } = await params;
  const job = findIndustryTemplate(jobId);
  if (!job) notFound();

  return (
    <TemplateDetail
      title={job.title}
      chip={BUILT_IN_LABEL}
      // English translation: About the job
      summary={{ label: 'Om stillingen', text: job.description }}
      fields={[
        // English translation: Industry
        { label: 'Bransje', links: [{ href: industryHref(job.industry), label: job.industry }] },
        // English translation: Employer
        { label: 'Arbeidsgiver', text: SECTOR_LABELS[job.sector] },
        // English translation: Typical tasks
        { label: 'Typiske oppgaver', chips: job.tasks },
        // English translation: What the interviewer is told about the job
        { label: 'Dette får intervjueren vite om stillingen', text: job.jobDescription },
      ]}
    />
  );
}
