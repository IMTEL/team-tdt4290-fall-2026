import type { Metadata } from 'next';

import { EditTemplate } from './EditTemplate';

export const metadata: Metadata = {
  title: 'Rediger mal',
};

interface EditTemplatePageProps {
  params: Promise<{ templateId: string }>;
}

export default async function EditTemplatePage({ params }: EditTemplatePageProps) {
  const { templateId } = await params;
  return <EditTemplate templateId={templateId} />;
}
