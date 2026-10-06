'use client';

import { useState } from 'react';
import Button from '@mui/material/Button';

import { TemplatePicker } from '@/components/templates/TemplatePicker';
import { interviewerTemplates, type InterviewerTemplate } from '@/data/interviewer-templates';
import { ConfigurationChat } from './ConfigurationChat';
import styles from './page.module.css';

/** First the counsellor picks a template, which decides the interviewer. Then the chat starts. */
export function ConfigureInterviewer() {
  const [template, setTemplate] = useState<InterviewerTemplate | null>(null);

  if (!template) {
    return <TemplatePicker templates={interviewerTemplates} onSelect={setTemplate} />;
  }

  return (
    <>
      <div className={styles.chosen}>
        <p>
          Intervjuer: <strong>{template.title}</strong>
        </p>
        {/* Changing the template starts the conversation over, since the chat was set up for it. */}
        <Button variant="outlined" size="small" onClick={() => setTemplate(null)}>
          Bytt mal
        </Button>
      </div>
      <ConfigurationChat key={template.id} template={template} />
    </>
  );
}
