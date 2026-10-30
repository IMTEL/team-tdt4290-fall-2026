'use client';

import { useRouter } from 'next/navigation';

import { IndustryTemplateForm } from '@/components/templates/IndustryTemplateForm';
import { useWorkplaceTemplates } from '@/components/templates/useWorkplaceTemplates';
import { saveIndustryTemplate } from '@/components/templates/workplaceApi';
import { industryNames } from '@/domain/workplaceTemplate';
import { setTemplatesFlash, TEMPLATE_CREATED_FLASH } from '../../flash';

/** The form for a new bransjemal. Saving goes back to the templates. */
export function CreateIndustryTemplate() {
  const router = useRouter();
  const { jobs, industries } = useWorkplaceTemplates();

  return (
    <IndustryTemplateForm
      takenNames={industryNames(jobs, industries)}
      cancelHref="/templates"
      onSave={async (template) => {
        await saveIndustryTemplate(template);
        setTemplatesFlash(TEMPLATE_CREATED_FLASH);
        router.push('/templates');
      }}
    />
  );
}
