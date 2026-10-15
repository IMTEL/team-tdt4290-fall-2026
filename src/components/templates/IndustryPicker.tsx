'use client';

import { useState } from 'react';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Chip from '@mui/material/Chip';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { SECTOR_LABELS, type IndustryTemplate, type Sector } from '@/data/industry-templates';
import styles from './TemplatePicker.module.css';

type SectorFilter = Sector | 'alle';

type IndustryPickerProps = {
  templates: IndustryTemplate[];
  /** Called with the chosen template, or null to go on without one. */
  onSelect: (template: IndustryTemplate | null) => void;
};

/** Lets the counsellor pick a general job in an industry, public or private, or go on without. */
export function IndustryPicker({ templates, onSelect }: IndustryPickerProps) {
  const [sector, setSector] = useState<SectorFilter>('alle');
  const shown =
    sector === 'alle' ? templates : templates.filter((template) => template.sector === sector);

  return (
    <section aria-labelledby="industry-picker-heading" className={styles.picker}>
      <Button variant="contained" onClick={() => onSelect(null)} className={styles.scratch}>
        Fortsett uten bransjemal
      </Button>

      <h2 id="industry-picker-heading" className={styles.heading}>
        Velg en bransjemal
      </h2>
      <p className={styles.lead}>
        Bransjemalen bestemmer stillingen og bransjen, og om arbeidsgiveren er offentlig eller
        privat. Uten bransjemal spør assistenten deg om stillingen også.
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
