'use client';

import { saveLegalTemplate } from '@/components/legalTemplates/api';
import { LegalTemplateForm } from '@/components/legalTemplates/LegalTemplateForm';

/** The form for a new legal template. A client component, since it passes a function on. */
export function CreateLegalTemplateForm() {
  return (
    <LegalTemplateForm
      onSave={async (template) => {
        await saveLegalTemplate(template);
      }}
    />
  );
}
