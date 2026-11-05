import type { Metadata } from 'next';

import { returnPath } from '@/lib/returnTo';
import { EditTemplate } from './EditTemplate';

export const metadata: Metadata = {
  title: 'Rediger mal',
};

interface EditTemplatePageProps {
  params: Promise<{ templateId: string }>;
  searchParams: Promise<{ returnTo?: string | string[] }>;
}

export default async function EditTemplatePage({ params, searchParams }: EditTemplatePageProps) {
  const { templateId } = await params;
  const { returnTo } = await searchParams;
  return <EditTemplate templateId={templateId} cancelHref={returnPath(returnTo) ?? '/templates'} />;
}
