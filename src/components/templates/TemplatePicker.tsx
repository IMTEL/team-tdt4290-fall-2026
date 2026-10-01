'use client';

import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Chip from '@mui/material/Chip';

import type { InterviewerTemplate } from '@/data/interviewer-templates';
import styles from './TemplatePicker.module.css';

type TemplatePickerProps = {
  templates: InterviewerTemplate[];
  /** Called with the chosen template, or null to start from scratch. */
  onSelect: (template: InterviewerTemplate | null) => void;
};

export function TemplatePicker({ templates, onSelect }: TemplatePickerProps) {
  return (
    <section aria-labelledby="template-picker-heading" className={styles.picker}>
      <h2 id="template-picker-heading" className={styles.heading}>
        Velg en mal
      </h2>
      <p className={styles.lead}>
        Ta utgangspunkt i en vanlig type intervjuer. Du kan endre alt underveis.
      </p>

      <ul className={styles.grid}>
        {templates.map((template) => (
          <li key={template.id}>
            <Card variant="outlined" className={styles.card}>
              <CardActionArea onClick={() => onSelect(template)} className={styles.action}>
                <h3 className={styles.title}>{template.title}</h3>
                <p className={styles.description}>{template.description}</p>
                <div className={styles.focus}>
                  {template.focus.map((item) => (
                    <Chip key={item} label={item} size="small" />
                  ))}
                </div>
              </CardActionArea>
            </Card>
          </li>
        ))}
      </ul>

      <Button variant="text" onClick={() => onSelect(null)} className={styles.scratch}>
        Start uten mal
      </Button>
    </section>
  );
}
