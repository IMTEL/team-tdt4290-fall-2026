import type { Metadata } from 'next';

import { TemplateDetailView } from './TemplateDetailView';

export const metadata: Metadata = {
  title: 'Mal',
};

interface TemplatePageProps {
  params: Promise<{ templateId: string }>;
}

export default async function TemplatePage({ params }: TemplatePageProps) {
  const { templateId } = await params;
  return <TemplateDetailView templateId={templateId} />;
}
