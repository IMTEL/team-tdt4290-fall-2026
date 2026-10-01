'use client';

import { useState } from 'react';
import Button from '@mui/material/Button';

import { TemplatePicker } from '@/components/templates/TemplatePicker';
import { interviewerTemplates, type InterviewerTemplate } from '@/data/interviewer-templates';
import { ConfigurationChat } from './ConfigurationChat';
import styles from './page.module.css';

// undefined: the counsellor hasn't chosen yet. null: they chose to start without a template.
type Choice = InterviewerTemplate | null | undefined;

export function ConfigureInterviewer() {
  const [choice, setChoice] = useState<Choice>(undefined);

  if (choice === undefined) {
    return <TemplatePicker templates={interviewerTemplates} onSelect={setChoice} />;
  }

  return (
    <>
      <div className={styles.templateBar}>
        <span>{choice ? `Mal: ${choice.title}` : 'Uten mal'}</span>
        {/* Going back starts the conversation over, since the template is part of its history. */}
        <Button size="small" onClick={() => setChoice(undefined)}>
          Bytt mal
        </Button>
      </div>
      <ConfigurationChat template={choice} />
    </>
  );
}
