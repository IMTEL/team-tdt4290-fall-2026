'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { notFound, useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';

import { DeleteWorkplaceTemplateButton } from '@/components/templates/DeleteWorkplaceTemplateButton';
import {
  BUILT_IN_LABEL,
  TemplateDetail,
  TemplateDetailPage,
  TemplateDetailSkeleton,
} from '@/components/templates/TemplateDetail';
import { deleteJobTemplate, fetchJobTemplate } from '@/components/templates/workplaceApi';
import { findJobTemplate, SECTOR_LABELS, type JobTemplate } from '@/data/job-templates';
import { industryHref, jobHref, OWN_TEMPLATE_LABEL } from '@/domain/templateCatalog';
import { setTemplatesFlash, TEMPLATE_DELETED_FLASH } from '../../flash';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; job: JobTemplate; builtIn: boolean }
  | { kind: 'missing' }
  | { kind: 'error'; message: string };

/**
 * One stillingsmal. The job description is what the interviewer gets in its Stilling answer. The
 * counsellor's own have the buttons to edit and delete them; the built-in ones have none.
 */
export function JobTemplateView({ jobId }: { jobId: string }) {
  const router = useRouter();
  const builtIn = findJobTemplate(jobId);
  const [state, setState] = useState<LoadState>(
    builtIn ? { kind: 'ready', job: builtIn, builtIn: true } : { kind: 'loading' },
  );

  useEffect(() => {
    // A built-in one is already here; only the counsellor's own are in RAGdoll.
    if (builtIn) return;
    let cancelled = false;
    fetchJobTemplate(jobId)
      .then((job) => {
        if (!cancelled)
          setState(job ? { kind: 'ready', job, builtIn: false } : { kind: 'missing' });
      })
      .catch((error: Error) => {
        if (!cancelled) setState({ kind: 'error', message: error.message });
      });
    return () => {
      cancelled = true;
    };
  }, [jobId, builtIn]);

  if (state.kind === 'missing') notFound();

  if (state.kind !== 'ready') {
    return (
      <TemplateDetailPage>
        {/* English translation: Loading job template */}
        {state.kind === 'loading' && <TemplateDetailSkeleton label="Laster stillingsmal" />}
        {state.kind === 'error' && <Alert severity="error">{state.message}</Alert>}
      </TemplateDetailPage>
    );
  }

  const { job } = state;
  return (
    <TemplateDetail
      title={job.title}
      chip={state.builtIn ? BUILT_IN_LABEL : OWN_TEMPLATE_LABEL}
      // English translation: About the job
      summary={{ label: 'Om stillingen', text: job.description }}
      actions={
        !state.builtIn && (
          <>
            <Button component={Link} href={`${jobHref(job.id)}/edit`} variant="outlined">
              Rediger
            </Button>
            <DeleteWorkplaceTemplateButton
              name={job.title}
              noun="stillingsmalen"
              onDelete={() => deleteJobTemplate(job.id)}
              onDeleted={() => {
                setTemplatesFlash(TEMPLATE_DELETED_FLASH);
                router.push('/templates');
              }}
            />
          </>
        )
      }
      fields={[
        // English translation: Industry
        { label: 'Bransje', links: [{ href: industryHref(job.industry), label: job.industry }] },
        // English translation: Employer
        { label: 'Arbeidsgiver', text: SECTOR_LABELS[job.sector] },
        // English translation: Typical tasks
        { label: 'Typiske oppgaver', chips: job.tasks },
        // English translation: What the interviewer is told about the job
        {
          label: 'Dette får intervjueren vite om stillingen',
          text: job.jobDescription,
          boxed: true,
        },
      ]}
    />
  );
}
