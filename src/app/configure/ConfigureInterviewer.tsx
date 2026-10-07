'use client';

import { useState } from 'react';
import Button from '@mui/material/Button';

import { TemplatePicker } from '@/components/templates/TemplatePicker';
import { interviewerTemplates, type InterviewerTemplate } from '@/data/interviewer-templates';
import { ConfigurationChat } from './ConfigurationChat';
import styles from './page.module.css';

// undefined: the counsellor hasn't chosen yet. null: they chose to continue without a template.
type Choice = InterviewerTemplate | null | undefined;

/**
 * First the counsellor picks a template, which decides the interviewer, or continues without one.
 * Then the chat starts.
 */
export function ConfigureInterviewer() {
  const [choice, setChoice] = useState<Choice>(undefined);

  if (choice === undefined) {
    return <TemplatePicker templates={interviewerTemplates} onSelect={setChoice} />;
  }

  return (
    <>
      <div className={styles.chosen}>
        <p>
          {choice ? (
            <>
              Intervjuer: <strong>{choice.title}</strong>
            </>
          ) : (
              <>
                Intervjuer: <strong>Ingen mal valgt</strong>
              </>
          )}
        </p>
        {/* Changing the template starts the conversation over, since the chat was set up for it. */}
        <Button variant="outlined" size="small" onClick={() => setChoice(undefined)}>
          {choice ? 'Bytt mal' : 'Velg en mal'}
        </Button>
      </div>
      <ConfigurationChat key={choice?.id ?? 'none'} template={choice} />
    </>
  );
}
