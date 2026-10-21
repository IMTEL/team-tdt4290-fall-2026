'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { SECTOR_LABELS, type IndustryTemplate, type Sector } from '@/data/industry-templates';
import styles from './StillingStep.module.css';

/** How many job suggestions sit next to «Se alle maler». */
const SUGGESTION_COUNT = 5;

const SECTIONS = [
  'Stilling og arbeidsplass',
  'Intervjuer',
  'Jobbsøker',
  'Innstillinger',
  'Fullføre',
] as const;

export type Employer = Sector | 'ikke-oppgitt';

export type Workplace = {
  jobTitle: string;
  templateId: string | null;
  industry: string;
  sector: Employer | null;
  company: string;
};

type StillingStepProps = {
  value: Workplace;
  templates: IndustryTemplate[];
  onChange: (value: Workplace) => void;
  onNext: () => void;
};

function industriesOf(templates: IndustryTemplate[]): string[] {
  const seen = new Set<string>();
  for (const template of templates) seen.add(template.industry);
  return [...seen];
}

/** The shared frame: title, and the section list down the side. `current` is the open section. */
export function WizardFrame({ current, children }: { current: number; children: ReactNode }) {
  const done = Math.min(current, SECTIONS.length);

  return (
    <div className={styles.step}>
      <p className={styles.crumb}>
        <Link href="/browse-agents">Agenter</Link>
        <span aria-hidden="true"> › </span>
        Ny agent
      </p>
      <h1 className={styles.title}>Ny intervjuagent</h1>
      <p className={styles.lead}>
        Svar på noen få spørsmål. Du ser agenten ta form til høyre mens du går.
      </p>

      <div className={styles.layout}>
        {children}
        <aside className={styles.side} aria-label="Seksjoner">
          <p className={styles.sideLabel}>Seksjoner</p>
          <ol className={styles.sections}>
            {SECTIONS.map((section, index) => (
              <li
                key={section}
                className={index === current ? styles.current : undefined}
                aria-current={index === current ? 'step' : undefined}
              >
                <span
                  className={index < current ? styles.doneMark : styles.mark}
                  aria-hidden="true"
                />
                {section}
              </li>
            ))}
          </ol>
          <div className={styles.draft}>
            <Button type="button" variant="outlined" fullWidth>
              Lagre utkast
            </Button>
          </div>
          <p className={styles.count}>
            {done} av {SECTIONS.length} seksjoner
          </p>
          <div className={styles.track} aria-hidden="true">
            <div
              className={styles.fill}
              style={{ width: done === 0 ? '0.6rem' : `${(done / SECTIONS.length) * 100}%` }}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}

/**
 * The first screen of a new interviewer, laid out like draft A without the stepper across the
 * top. The section list is the slim one from draft C.
 */
export function StillingStep({ value, templates, onChange, onNext }: StillingStepProps) {
  const [showAllJobs, setShowAllJobs] = useState(false);
  const [showAllIndustries, setShowAllIndustries] = useState(false);
  const industries = industriesOf(templates);
  const suggestions = showAllJobs ? templates : templates.slice(0, SUGGESTION_COUNT);
  const shownIndustries = showAllIndustries ? industries : industries.slice(0, SUGGESTION_COUNT);

  function pickTemplate(template: IndustryTemplate) {
    onChange({ ...value, templateId: template.id });
  }

  return (
    <WizardFrame current={0}>
      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          onNext();
        }}
      >
        <h2 className={styles.question}>Hvilken stilling skal jobbsøkeren øve til?</h2>
        <p className={styles.hint}>Velg en stilling fra en mal, eller skriv inn din egen.</p>

        <TextField
          label="Stilling"
          value={value.jobTitle}
          onChange={(event) => onChange({ ...value, jobTitle: event.target.value })}
          fullWidth
        />

        <div className={styles.suggestions}>
          <p className={styles.suggestionLabel}>Stillingsmaler</p>
          <div className={styles.pills}>
            {suggestions.map((template) => {
              const selected = value.templateId === template.id;
              return (
                <Button
                  key={template.id}
                  type="button"
                  size="small"
                  variant={selected ? 'contained' : 'outlined'}
                  aria-pressed={selected}
                  onClick={() => pickTemplate(template)}
                >
                  {template.title}
                </Button>
              );
            })}
            {templates.length > SUGGESTION_COUNT && (
              <Button
                type="button"
                size="small"
                variant="text"
                className={styles.more}
                aria-expanded={showAllJobs}
                onClick={() => setShowAllJobs((open) => !open)}
              >
                {showAllJobs ? 'Vis færre' : 'Se alle maler'}
              </Button>
            )}
          </div>
        </div>

        <div className={styles.suggestions}>
          <p className={styles.suggestionLabel}>Bransje</p>
          <div className={styles.pills}>
            {shownIndustries.map((industry) => {
              const selected = value.industry === industry;
              return (
                <Button
                  key={industry}
                  type="button"
                  size="small"
                  variant={selected ? 'contained' : 'outlined'}
                  aria-pressed={selected}
                  onClick={() => onChange({ ...value, industry })}
                >
                  {industry}
                </Button>
              );
            })}
            {industries.length > SUGGESTION_COUNT && (
              <Button
                type="button"
                size="small"
                variant="text"
                className={styles.more}
                aria-expanded={showAllIndustries}
                onClick={() => setShowAllIndustries((open) => !open)}
              >
                {showAllIndustries ? 'Vis færre' : 'Se alle maler'}
              </Button>
            )}
          </div>
        </div>

        <div className={styles.employer}>
          <span className={styles.suggestionLabel} id="employer-label">
            Arbeidsgiver
          </span>
          <ToggleButtonGroup
            exclusive
            size="small"
            className={styles.sector}
            value={value.sector}
            aria-labelledby="employer-label"
            onChange={(_event, sector: Employer | null) => onChange({ ...value, sector })}
          >
            <ToggleButton value="offentlig">{SECTOR_LABELS.offentlig}</ToggleButton>
            <ToggleButton value="privat">{SECTOR_LABELS.privat}</ToggleButton>
            <ToggleButton value="ikke-oppgitt">Ikke oppgitt</ToggleButton>
          </ToggleButtonGroup>
        </div>

        <TextField
          label="Bedrift (valgfritt)"
          value={value.company}
          onChange={(event) => onChange({ ...value, company: event.target.value })}
          helperText="Du kan hoppe over dette. Intervjueren bruker da en generell bedrift."
          fullWidth
        />

        <div className={styles.actions}>
          <div className={styles.nav}>
            <Button component={Link} href="/browse-agents">
              Tilbake
            </Button>
            <Button type="submit" variant="contained">
              Neste
            </Button>
          </div>
        </div>
      </form>
    </WizardFrame>
  );
}
