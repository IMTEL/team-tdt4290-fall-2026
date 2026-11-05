'use client';

import { useState } from 'react';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Chip from '@mui/material/Chip';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { SECTOR_LABELS, type JobTemplate, type Sector } from '@/data/job-templates';
import styles from './TemplatePicker.module.css';

type SectorFilter = Sector | 'alle';

type JobTemplatePickerProps = {
  templates: JobTemplate[];
  /** Called with the chosen stillingsmal, or null to go on without one. */
  onSelect: (template: JobTemplate | null) => void;
};

/** Lets the counsellor pick a stillingsmal (job in an industry), or go on without. */
export function JobTemplatePicker({ templates, onSelect }: JobTemplatePickerProps) {
  const [sector, setSector] = useState<SectorFilter>('alle');
  const shown =
    sector === 'alle' ? templates : templates.filter((template) => template.sector === sector);

  return (
    <section aria-labelledby="job-template-picker-heading" className={styles.picker}>
      <Button variant="contained" onClick={() => onSelect(null)} className={styles.scratch}>
        Fortsett uten stillingsmal
      </Button>

      <h2 id="job-template-picker-heading" className={styles.heading}>
        Velg en stillingsmal
      </h2>
      <p className={styles.lead}>
        Stillingsmalen bestemmer stillingen og bransjen, og om arbeidsgiveren er offentlig eller
        privat. Uten stillingsmal spør assistenten deg om stillingen også.
      </p>

      <ToggleButtonGroup
        value={sector}
        exclusive
        // Clicking the chosen button again gives null; keep the filter as it was then.
        onChange={(_event, value: SectorFilter | null) => value && setSector(value)}
        aria-label="Sektor"
        size="small"
        className={styles.scratch}
      >
        <ToggleButton value="alle">Alle</ToggleButton>
        <ToggleButton value="offentlig">{SECTOR_LABELS.offentlig}</ToggleButton>
        <ToggleButton value="privat">{SECTOR_LABELS.privat}</ToggleButton>
      </ToggleButtonGroup>

      <ul className={styles.grid}>
        {shown.map((template) => (
          <li key={template.id}>
            <Card variant="outlined" className={styles.card}>
              <CardActionArea onClick={() => onSelect(template)} className={styles.action}>
                <h3 className={styles.title}>{template.title}</h3>
                <p className={styles.meta}>
                  {template.industry} · {SECTOR_LABELS[template.sector]}
                </p>
                <p className={styles.description}>{template.description}</p>
                <div className={styles.focus}>
                  {template.tasks.map((task) => (
                    <Chip key={task} label={task} size="small" />
                  ))}
                </div>
              </CardActionArea>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
