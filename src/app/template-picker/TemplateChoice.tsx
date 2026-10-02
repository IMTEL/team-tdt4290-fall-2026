'use client';

import { useState } from 'react';
import Link from 'next/link';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';

import { TemplatePicker } from '@/components/templates/TemplatePicker';
import { interviewerTemplates, type InterviewerTemplate } from '@/data/interviewer-templates';
import styles from './page.module.css';

// undefined: the counsellor hasn't chosen yet. null: they chose to start without a template.
type Choice = InterviewerTemplate | null | undefined;

// The choice only lives on this page for now. Sending it to the configuration chat comes with the
// backend.
export function TemplateChoice() {
  const [choice, setChoice] = useState<Choice>(undefined);

  if (choice === undefined) {
    return <TemplatePicker templates={interviewerTemplates} onSelect={setChoice} />;
  }

  return (
    <div className={styles.chosen}>
      <Alert severity="success">
        {choice ? `Du har valgt malen «${choice.title}».` : 'Du starter uten mal.'}
      </Alert>
      <div className={styles.actions}>
        <Button variant="contained" onClick={() => setChoice(undefined)}>
          Velg en annen mal
        </Button>
        <Link href="/configure" className={styles.link}>
          Tilbake til samtalen
        </Link>
      </div>
    </div>
  );
}
