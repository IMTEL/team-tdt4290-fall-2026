'use client';

import { useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import Alert from '@mui/material/Alert';

import { fetchLegalTemplate, updateLegalTemplate } from '@/components/legalTemplates/api';
import { LegalTemplateForm } from '@/components/legalTemplates/LegalTemplateForm';
import type { LegalTemplate } from '@/domain/legalTemplate';
import styles from '../../page.module.css';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; template: LegalTemplate }
  | { kind: 'missing' }
  | { kind: 'error'; message: string };

/** Loads one of the counsellor's legal templates and shows the form for editing it. */
export function EditLegalTemplate({ templateId }: { templateId: string }) {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    fetchLegalTemplate(templateId)
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
        <h1 className={styles.title}>Rediger lovverk</h1>
        <p className={styles.lead}>
          {/* English translation: Changes apply to interviewers you set up from now on.
          Interviewers you have already saved stay as they are. */}
          Endringene gjelder intervjuere du setter opp fra nå av. Intervjuere du allerede har
          lagret, blir som de er.
        </p>
      </header>

      {state.kind === 'loading' && <p>Laster lovverk …</p>}
      {state.kind === 'error' && <Alert severity="error">{state.message}</Alert>}
      {state.kind === 'ready' && (
        <LegalTemplateForm
          initial={state.template}
          onSave={(template) => updateLegalTemplate(templateId, template)}
        />
      )}
    </div>
  );
}
