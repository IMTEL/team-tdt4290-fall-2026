'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';

import { builtInLegalTemplates } from '@/data/legal-templates';
import { LEGAL_JURISDICTION_LABELS, type LegalTemplate } from '@/domain/legalTemplate';
import styles from '@/components/profiles/ProfileList.module.css';
import { fetchLegalTemplates } from './api';
import { DeleteLegalTemplateButton } from './DeleteLegalTemplateButton';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; templates: LegalTemplate[] }
  | { kind: 'error'; message: string };

/**
 * The built-in legal templates, then the counsellor's own, with links to edit and buttons to
 * delete their own.
 */
export function LegalTemplateList() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    fetchLegalTemplates(controller.signal)
      .then((templates) => setState({ kind: 'ready', templates }))
      .catch((error: Error) => {
        if (!controller.signal.aborted) setState({ kind: 'error', message: error.message });
      });
    return () => controller.abort();
  }, []);

  function removeTemplate(id: string) {
    setState((current) =>
      current.kind === 'ready'
        ? { ...current, templates: current.templates.filter((template) => template.id !== id) }
        : current,
    );
  }

  const own = state.kind === 'ready' ? state.templates : [];

  return (
    <>
      {state.kind === 'loading' && <p>Laster lovverk …</p>}
      {/* The built-in templates are still shown, so the counsellor can see what they say. */}
      {state.kind === 'error' && <Alert severity="error">{state.message}</Alert>}
      <ul className={styles.grid}>
        {[...builtInLegalTemplates, ...own].map((template) => (
          <li key={template.id}>
            <Card variant="outlined" className={styles.card}>
              <CardContent className={styles.content}>
                <h2 className={styles.title}>{template.title}</h2>
                <p className={styles.summary}>{template.description}</p>
                {(template.builtIn || template.jurisdiction) && (
                  <div className={styles.chips}>
                    {template.builtIn && <Chip label="Følger med appen" size="small" />}
                    {template.jurisdiction && (
                      <Chip label={LEGAL_JURISDICTION_LABELS[template.jurisdiction]} size="small" />
                    )}
                  </div>
                )}
              </CardContent>
              {!template.builtIn && (
                <CardActions>
                  <Button
                    component={Link}
                    href={`/legal-templates/${encodeURIComponent(template.id)}/edit`}
                    size="small"
                    aria-label={`Rediger ${template.title}`}
                  >
                    Rediger
                  </Button>
                  <DeleteLegalTemplateButton template={template} onDeleted={removeTemplate} />
                </CardActions>
              )}
            </Card>
          </li>
        ))}
      </ul>
      {state.kind === 'ready' && own.length === 0 && (
        <p className={styles.empty}>
          Du har ikke lagt til eget lovverk ennå. Legg til et, så kan du velge det når du setter opp
          en intervjuer.
        </p>
      )}
    </>
  );
}
