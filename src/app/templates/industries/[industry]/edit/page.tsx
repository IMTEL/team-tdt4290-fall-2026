import type { Metadata } from 'next';

import { EditIndustryTemplate } from './EditIndustryTemplate';

export const metadata: Metadata = {
  title: 'Rediger bransjemal',
};

interface EditIndustryTemplatePageProps {
  params: Promise<{ industry: string }>;
}

export default async function EditIndustryTemplatePage({ params }: EditIndustryTemplatePageProps) {
  const { industry } = await params;
  let slug = industry;
  try {
    slug = decodeURIComponent(industry);
  } catch {
    // Not encoded the way we write it; look it up as it is.
  }
  return <EditIndustryTemplate slug={slug} />;
}
