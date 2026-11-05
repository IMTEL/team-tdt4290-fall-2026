'use client';

import { useEffect, useState } from 'react';
import { notFound, useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';

import { JobTemplateForm } from '@/components/templates/JobTemplateForm';
import { useWorkplaceTemplates } from '@/components/templates/useWorkplaceTemplates';
import { fetchJobTemplate, updateJobTemplate } from '@/components/templates/workplaceApi';
import type { JobTemplate } from '@/data/job-templates';
import { jobHref } from '@/domain/templateCatalog';
import { industryNames } from '@/domain/workplaceTemplate';
import { setTemplatesFlash, TEMPLATE_SAVED_FLASH } from '../../../flash';
import styles from '../../../formPage.module.css';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; job: JobTemplate }
  | { kind: 'missing' }
  | { kind: 'error'; message: string };

/**
 * Loads one of the counsellor's stillingsmaler and shows the form for editing it. A built-in one
 * is not in RAGdoll, so it is not found here.
 */
export function EditJobTemplate({ jobId }: { jobId: string }) {
  const router = useRouter();
  const { jobs, industries } = useWorkplaceTemplates();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    fetchJobTemplate(jobId)
      .then((job) => {
        if (!cancelled) setState(job ? { kind: 'ready', job } : { kind: 'missing' });
      })
      .catch((error: Error) => {
        if (!cancelled) setState({ kind: 'error', message: error.message });
      });
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  if (state.kind === 'missing') notFound();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Rediger stillingsmal</h1>
        <p className={styles.lead}>
          {/* English translation: Changes apply to interviewers you set up from now on.
          Interviewers you have already saved stay as they are. */}
          Endringene gjelder intervjuere du setter opp fra nå av. Intervjuere du allerede har
          lagret, blir som de er.
        </p>
      </header>

      {state.kind === 'loading' && <p>Laster stillingsmal …</p>}
      {state.kind === 'error' && <Alert severity="error">{state.message}</Alert>}
      {state.kind === 'ready' && (
        <JobTemplateForm
          initial={state.job}
          industries={industryNames(jobs, industries)}
          cancelHref={jobHref(jobId)}
          onSave={async (template) => {
            await updateJobTemplate(jobId, template);
            setTemplatesFlash(TEMPLATE_SAVED_FLASH);
            router.push('/templates');
          }}
        />
      )}
    </div>
  );
}
