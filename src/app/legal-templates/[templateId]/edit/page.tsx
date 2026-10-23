import type { Metadata } from 'next';

import { EditLegalTemplate } from './EditLegalTemplate';

export const metadata: Metadata = {
  title: 'Rediger lovverk',
};

interface EditLegalTemplatePageProps {
  params: Promise<{ templateId: string }>;
}

export default async function EditLegalTemplatePage({ params }: EditLegalTemplatePageProps) {
  const { templateId } = await params;
  return <EditLegalTemplate templateId={templateId} />;
}
