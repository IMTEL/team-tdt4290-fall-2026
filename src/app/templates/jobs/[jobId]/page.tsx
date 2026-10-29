import type { Metadata } from 'next';

import { findIndustryTemplate } from '@/data/industry-templates';
import { JobTemplateView } from './JobTemplateView';

interface JobTemplatePageProps {
  params: Promise<{ jobId: string }>;
}

export async function generateMetadata({ params }: JobTemplatePageProps): Promise<Metadata> {
  const { jobId } = await params;
  // English translation: Job template
  return { title: findIndustryTemplate(jobId)?.title ?? 'Stillingsmal' };
}

/** One stillingsmal: built in, or one of the counsellor's own. */
export default async function JobTemplatePage({ params }: JobTemplatePageProps) {
  const { jobId } = await params;
  return <JobTemplateView jobId={jobId} />;
}
