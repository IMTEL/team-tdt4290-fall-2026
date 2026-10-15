'use client';

import { saveTemplate } from '@/components/templates/api';
import { TemplateForm } from '@/components/templates/TemplateForm';

/**
 * The template form for a new template, starting with `agentType` if it is given. A client
 * component, since it passes a function on.
 */
export function CreateTemplateForm({ agentType }: { agentType?: string | null }) {
  return (
    <TemplateForm
      defaultAgentType={agentType}
      onSave={async (template) => {
        await saveTemplate(template);
      }}
    />
  );
}
