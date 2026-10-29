'use client';

import { useRouter } from 'next/navigation';

import { JobTemplateForm } from '@/components/templates/JobTemplateForm';
import { useWorkplaceTemplates } from '@/components/templates/useWorkplaceTemplates';
import { saveJobTemplate } from '@/components/templates/workplaceApi';
import { industryNames } from '@/domain/workplaceTemplate';
import { setTemplatesFlash, TEMPLATE_CREATED_FLASH } from '../../flash';

/** The form for a new stillingsmal. Saving goes back to the templates. */
export function CreateJobTemplate() {
  const router = useRouter();
  const { jobs } = useWorkplaceTemplates();

  return (
    <JobTemplateForm
      industries={industryNames(jobs)}
      cancelHref="/templates"
      onSave={async (template) => {
        await saveJobTemplate(template);
        setTemplatesFlash(TEMPLATE_CREATED_FLASH);
        router.push('/templates');
      }}
    />
  );
}
