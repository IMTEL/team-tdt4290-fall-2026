'use client';

import Link from 'next/link';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardActions from '@mui/material/CardActions';
import Chip from '@mui/material/Chip';

import type { InterviewerTemplate } from '@/data/interviewer-templates';
import { DeleteTemplateButton } from './DeleteTemplateButton';
import styles from './TemplatePicker.module.css';

type TemplatePickerProps = {
  /** The built-in templates. */
  templates: InterviewerTemplate[];
  /** The counsellor's own templates, shown after the built-in ones and with edit and delete. */
  savedTemplates?: InterviewerTemplate[];
  /** Called with the chosen template, or null to start without one. */
  onSelect: (template: InterviewerTemplate | null) => void;
  /** Called with the id of a saved template once it is deleted. */
  onDeleted?: (id: string) => void;
};

export function TemplatePicker({
  templates,
  savedTemplates = [],
  onSelect,
  onDeleted = () => {},
}: TemplatePickerProps) {
  function card(template: InterviewerTemplate, saved: boolean) {
    return (
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
          {/* Outside the action area: a button inside a button is not valid HTML. */}
          {saved && (
            <CardActions className={styles.cardActions}>
              <Button
                component={Link}
                href={`/templates/${encodeURIComponent(template.id)}/edit`}
                size="small"
                aria-label={`Rediger ${template.title}`}
              >
                Rediger
              </Button>
              <DeleteTemplateButton template={template} onDeleted={onDeleted} />
            </CardActions>
          )}
        </Card>
      </li>
    );
  }

  return (
    <section aria-labelledby="template-picker-heading" className={styles.picker}>
      <Button variant="contained" onClick={() => onSelect(null)} className={styles.scratch}>
        Fortsett uten mal
      </Button>

      <Button
        component={Link}
        href="/create-template"
        variant="outlined"
        className={styles.scratch}
      >
        Lag en ny mal
      </Button>

      <h2 id="template-picker-heading" className={styles.heading}>
        Velg en mal
      </h2>
      <p className={styles.lead}>
        Malen bestemmer hvem som intervjuer jobbsøkeren. Resten setter du opp i samtalen. Uten mal
        spør assistenten deg om intervjueren også.
      </p>

      <ul className={styles.grid}>
        {templates.map((template) => card(template, false))}
        {savedTemplates.map((template) => card(template, true))}
      </ul>
    </section>
  );
}
