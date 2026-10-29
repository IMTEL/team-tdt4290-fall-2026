import type { Metadata } from 'next';

import { EditJobTemplate } from './EditJobTemplate';

export const metadata: Metadata = {
  title: 'Rediger stillingsmal',
};

interface EditJobTemplatePageProps {
  params: Promise<{ jobId: string }>;
}

export default async function EditJobTemplatePage({ params }: EditJobTemplatePageProps) {
  const { jobId } = await params;
  return <EditJobTemplate jobId={jobId} />;
}
