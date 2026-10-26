'use client';

import { useEffect, useState } from 'react';
import { notFound, useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';

import { fetchTemplate, updateTemplate } from '@/components/templates/api';
import { TemplateForm } from '@/components/templates/TemplateForm';
import type { AgentTemplate } from '@/data/templates';
import styles from '@/app/create-template/page.module.css';
import { setTemplatesFlash, TEMPLATE_SAVED_FLASH } from '@/app/templates/flash';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; template: AgentTemplate }
  | { kind: 'missing' }
  | { kind: 'error'; message: string };

/** Loads one of the counsellor's saved templates and shows the form for editing it. */
export function EditTemplate({ templateId }: { templateId: string }) {
  const router = useRouter();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    fetchTemplate(templateId)
      .then((template) => {
        if (!cancelled) setState(template ? { kind: 'ready', template } : { kind: 'missing' });
      })
      .catch((error: Error) => {
        if (!cancelled) setState({ kind: 'error', message: error.message });
      });
    return () => {
      cancelled = true;
    };
  }, [templateId]);

  if (state.kind === 'missing') notFound();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Rediger mal</h1>
        <p className={styles.lead}>
          {/* English translation: Changes apply to interviewers you set up from now on.
          Interviewers you have already saved stay as they are. */}
          Endringene gjelder intervjuere du setter opp fra nå av. Intervjuere du allerede har
          lagret, blir som de er.
        </p>
      </header>

      {state.kind === 'loading' && <p>Laster mal …</p>}
      {state.kind === 'error' && <Alert severity="error">{state.message}</Alert>}
      {state.kind === 'ready' && (
        <TemplateForm
          initial={state.template}
          cancelHref="/templates"
          onSave={(template) => updateTemplate(templateId, template)}
          onSaved={() => {
            setTemplatesFlash(TEMPLATE_SAVED_FLASH);
            router.push('/templates');
          }}
        />
      )}
    </div>
  );
}
