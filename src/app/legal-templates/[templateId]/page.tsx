import type { Metadata } from 'next';

import { LegalTemplateDetail } from './LegalTemplateDetail';

export const metadata: Metadata = {
  title: 'Lovverk',
};

interface LegalTemplateDetailPageProps {
  params: Promise<{ templateId: string }>;
}

export default async function LegalTemplateDetailPage({ params }: LegalTemplateDetailPageProps) {
  const { templateId } = await params;
  return <LegalTemplateDetail templateId={templateId} />;
}
