import type { Metadata } from 'next';

import { returnPath } from '@/lib/returnTo';
import { TemplateDetailView } from './TemplateDetailView';

export const metadata: Metadata = {
  title: 'Mal',
};

interface TemplatePageProps {
  params: Promise<{ templateId: string }>;
  searchParams: Promise<{ returnTo?: string | string[] }>;
}

export default async function TemplatePage({ params, searchParams }: TemplatePageProps) {
  const { templateId } = await params;
  const { returnTo } = await searchParams;
  return (
    <TemplateDetailView templateId={templateId} backHref={returnPath(returnTo) ?? '/templates'} />
  );
}
