'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { notFound, useRouter } from 'next/navigation';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

import { fetchLegalTemplate } from '@/components/legalTemplates/api';
import { DeleteLegalTemplateButton } from '@/components/legalTemplates/DeleteLegalTemplateButton';
import { findBuiltInLegalTemplate } from '@/data/legal-templates';
import type { LegalTemplate } from '@/domain/legalTemplate';
import styles from './LegalTemplateDetail.module.css';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; template: LegalTemplate }
  | { kind: 'missing' }
  | { kind: 'error'; message: string };

/**
 * One legal template: what it covers, the text the interviewer follows, and for the counsellor's
 * own templates the buttons to edit and delete it. The built-in ones come with the app and can't
 * be changed, so they have no buttons.
 */
export function LegalTemplateDetail({ templateId }: { templateId: string }) {
  const router = useRouter();
  const builtIn = findBuiltInLegalTemplate(templateId);
  const [state, setState] = useState<LoadState>(
    builtIn ? { kind: 'ready', template: builtIn } : { kind: 'loading' },
  );

  useEffect(() => {
    // A built-in template is already here; only the counsellor's own are in RAGdoll.
    if (builtIn) return;
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
  }, [templateId, builtIn]);

  if (state.kind === 'missing') notFound();

  return (
    <div className={styles.page}>
      {/* The margin is on a wrapper: MUI's own styles load after ours and reset its margin. */}
      <div className={styles.backLink}>
        <Button component={Link} href="/templates" startIcon={<ArrowBackIcon />} size="small">
          {/* English translation: Back to the templates */}
          Tilbake til malene
        </Button>
      </div>

      {state.kind === 'loading' && <LegalTemplateDetailSkeleton />}
      {state.kind === 'error' && <Alert severity="error">{state.message}</Alert>}
      {state.kind === 'ready' && (
        <>
          <div className={styles.header}>
            <Typography variant="h4" component="h1">
              {state.template.title}
            </Typography>
            <div className={styles.meta}>
              {/* English translation: Comes with the app / Your own legal template */}
              <Chip
                label={state.template.builtIn ? 'Følger med appen' : 'Eget lovverk'}
                size="small"
                color="secondary"
              />
            </div>
          </div>

          {state.template.description && (
            <Paper
              component="section"
              variant="outlined"
              aria-labelledby="description-heading"
              className={styles.summary}
            >
              {/* English translation: What it covers */}
              <Typography
                id="description-heading"
                variant="overline"
                component="h2"
                className={styles.summaryLabel}
              >
                Hva det gjelder
              </Typography>
              <Typography variant="body1">{state.template.description}</Typography>
            </Paper>
          )}

          {!state.template.builtIn && (
            <div className={styles.actions}>
              <Button
                component={Link}
                href={`/legal-templates/${encodeURIComponent(state.template.id)}/edit`}
                variant="outlined"
              >
                Rediger
              </Button>
              <DeleteLegalTemplateButton
                template={state.template}
                variant="outlined"
                onDeleted={() => router.push('/templates')}
              />
            </div>
          )}

          <section aria-labelledby="text-heading">
            {/* English translation: What the interviewer follows */}
            <Typography id="text-heading" variant="h6" component="h2" className={styles.textLabel}>
              Dette følger intervjueren
            </Typography>
            <div className={styles.textBox}>
              <Typography component="p" variant="body1" className={styles.text}>
                {state.template.text}
              </Typography>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

/** The shape of the page while the template loads, so the page does not jump when it arrives. */
function LegalTemplateDetailSkeleton() {
  return (
    // English translation: Loading legal template
    <div role="status" aria-label="Laster lovverk">
      <Skeleton variant="text" width="70%" height={48} />
      <Skeleton variant="text" width="30%" />
      <Skeleton variant="rounded" height={88} className={styles.skeletonBlock} />
      <Skeleton variant="rounded" height={200} className={styles.skeletonBlock} />
    </div>
  );
}
