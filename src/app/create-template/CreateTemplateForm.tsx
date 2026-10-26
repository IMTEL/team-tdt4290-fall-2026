'use client';

import { useRouter } from 'next/navigation';

import { saveTemplate } from '@/components/templates/api';
import { TemplateForm } from '@/components/templates/TemplateForm';
import { setTemplatesFlash, TEMPLATE_CREATED_FLASH } from '@/app/templates/flash';

/**
 * The template form for a new template, starting with `agentType` if it is given. A client
 * component, since it passes a function on. After save it goes back to the templates list with a
 * toast.
 */
export function CreateTemplateForm({
  agentType,
  cancelHref,
}: {
  agentType?: string | null;
  cancelHref?: string | null;
}) {
  const router = useRouter();
  const backTo = cancelHref ?? '/templates';

  return (
    <TemplateForm
      defaultAgentType={agentType}
      cancelHref={backTo}
      onSave={async (template) => {
        await saveTemplate(template);
      }}
      onSaved={() => {
        setTemplatesFlash(TEMPLATE_CREATED_FLASH);
        router.push(backTo);
      }}
    />
  );
}
