'use client';

import { saveTemplate } from '@/components/templates/api';
import { TemplateForm } from '@/components/templates/TemplateForm';

/** The template form for a new template. A client component, since it passes a function on. */
export function CreateTemplateForm() {
  return (
    <TemplateForm
      onSave={async (template) => {
        await saveTemplate(template);
      }}
    />
  );
}
