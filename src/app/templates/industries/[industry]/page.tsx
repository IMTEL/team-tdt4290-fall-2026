import type { Metadata } from 'next';

import { industryTemplates } from '@/data/industry-templates';
import { findIndustry } from '@/domain/templateCatalog';
import { IndustryTemplateView } from './IndustryTemplateView';

interface IndustryTemplatePageProps {
  params: Promise<{ industry: string }>;
}

/** The industry's slug from the address. A slug never has «%», so decoding it twice does no harm. */
async function slugFrom(params: IndustryTemplatePageProps['params']): Promise<string> {
  const { industry } = await params;
  try {
    return decodeURIComponent(industry);
  } catch {
    // Not encoded the way we write it; look it up as it is.
    return industry;
  }
}

export async function generateMetadata({ params }: IndustryTemplatePageProps): Promise<Metadata> {
  // The counsellor's own industries are only known in the browser.
  // English translation: Industry template
  return {
    title: findIndustry(industryTemplates, await slugFrom(params))?.industry ?? 'Bransjemal',
  };
}

/** One industry and its stillingsmaler: built in, or one the counsellor made. */
export default async function IndustryTemplatePage({ params }: IndustryTemplatePageProps) {
  return <IndustryTemplateView slug={await slugFrom(params)} />;
}
