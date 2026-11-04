'use client';

import { useId, useState, type ReactNode } from 'react';
import Link from 'next/link';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { FieldHelp } from '@/components/ui/FieldHelp';
import helpStyles from '@/components/ui/FieldHelp.module.css';
import { SECTOR_LABELS, type IndustryTemplate, type Sector } from '@/data/industry-templates';
import { FORM_SECTIONS, formSectionHelpHref } from './formSections';
import styles from './StillingStep.module.css';

/** How many job suggestions sit next to «Se alle maler». */
const SUGGESTION_COUNT = 5;

/** The section titles, in order. The sections and their help anchors are in `formSections.ts`. */
export const SECTIONS = FORM_SECTIONS.map((section) => section.title);

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
  /** The industries to choose from: those of the stillingsmaler and the counsellor's own. */
  industries: string[];
  onChange: (value: Workplace) => void;
  onNext: () => void;
  /** Opens a section the counsellor has already been to. */
  onGoTo?: (index: number) => void;
  reached?: number;
  onSaveDraft?: () => void;
};

/** The shared frame: title, and the section list down the side. `current` is the open section. */
export function WizardFrame({
  current,
  onGoTo,
  reached,
  details,
  expanded = false,
  more,
  children,
}: {
  current: number;
  /** Opens a section the counsellor has already been to. */
  onGoTo?: (index: number) => void;
  /** The furthest section opened, so it can be jumped back to. */
  reached?: number;
  /** Values shown under each section dot on the last step. */
  details?: { label: string; value: string }[][];
  /** The last step: finish in the main card, sections stay their own card. */
  expanded?: boolean;
  more?: ReactNode;
  children: ReactNode;
}) {
  // Progress follows the furthest section opened, so jumping back does not empty the bar.
  const progress = Math.min(Math.max(reached ?? current, current), SECTIONS.length);

  return (
    <div className={styles.step}>
      <p className={styles.crumb}>
        <Link href="/browse-agents">Agenter</Link>
        <span aria-hidden="true"> › </span>
        Ny agent
      </p>
      <h1 className={styles.title}>Ny intervjuagent</h1>
      <p className={styles.lead}>
        Svar på noen få spørsmål. Du ser agenten ta form til høyre mens du går.{' '}
        {/* English translation: Read the help for this part. The form is kept in this browser,
        so the counsellor finds it again when coming back. */}
        <Link href={formSectionHelpHref(current)} className={styles.helpLink}>
          Les hjelpen for denne delen
        </Link>
      </p>

      <div className={expanded ? `${styles.layout} ${styles.layoutExpanded}` : styles.layout}>
        <div className={styles.formSlot}>
          {more ? <div className={styles.form}>{more}</div> : children}
        </div>
        <aside className={styles.side} aria-label="Seksjoner">
          <div>
            <p className={styles.sideLabel}>Seksjoner</p>
            {expanded ? <p className={styles.sideHint}>Det du har fylt inn</p> : null}
          </div>
          <SectionMenu current={current} onGoTo={onGoTo} reached={reached} details={details} />
          <p className={styles.count}>
            {progress} av {SECTIONS.length} seksjoner
          </p>
          <div className={styles.track} aria-hidden="true">
            <div
              className={styles.fill}
              style={{
                width: progress === 0 ? '0.6rem' : `${(progress / SECTIONS.length) * 100}%`,
              }}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}

/** Tilbake, Neste and Lagre utkast on one row, so the side card only holds the sections. */
export function WizardNav({
  onBack,
  backHref,
  onNext,
  nextDisabled,
  nextSubmit = false,
  nextLabel = 'Neste',
  extraNext,
  onSaveDraft,
}: {
  onBack?: () => void;
  backHref?: string;
  onNext?: () => void;
  nextDisabled?: boolean;
  nextSubmit?: boolean;
  nextLabel?: string;
  /** A second way forward, shown before Neste. */
  extraNext?: { label: string; onClick: () => void };
  /** Writes the unfinished wizard to local storage. */
  onSaveDraft?: () => void;
}) {
  return (
    <div className={styles.actions}>
      {onSaveDraft ? (
        <Button type="button" variant="outlined" onClick={onSaveDraft}>
          Lagre utkast
        </Button>
      ) : null}
      <div className={styles.nav}>
        {backHref ? (
          <Button component={Link} href={backHref}>
            Tilbake
          </Button>
        ) : (
          <Button type="button" onClick={onBack}>
            Tilbake
          </Button>
        )}
        {extraNext ? (
          <Button
            type="button"
            variant="outlined"
            disabled={nextDisabled}
            onClick={extraNext.onClick}
          >
            {extraNext.label}
          </Button>
        ) : null}
        <Button
          type={nextSubmit ? 'submit' : 'button'}
          variant="contained"
          disabled={nextDisabled}
          onClick={nextSubmit ? undefined : onNext}
        >
          {nextLabel}
        </Button>
      </div>
    </div>
  );
}

/** The choices already made on this step, shown above Neste. */
export function ChoiceSummary({ lines }: { lines: { label: string; value: string }[] }) {
  const headingId = useId();
  const shown = lines.filter((line) => {
    const value = line.value.trim();
    return value !== '' && value !== 'Ikke valgt';
  });
  if (shown.length === 0) return null;
  return (
    <section aria-labelledby={headingId} className={styles.choiceSummary}>
      <p id={headingId} className={styles.sideLabel}>
        Dine valg
      </p>
      <dl className={styles.choiceList}>
        {shown.map((line) => (
          <div
            key={line.label}
            className={
              line.value.length > 40
                ? `${styles.choiceRow} ${styles.choiceRowWide}`
                : styles.choiceRow
            }
          >
            <dt>{line.label}</dt>
            <dd>{line.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/**
 * The section list. A check means the counsellor has already been to that section (including ones
 * after the one they jumped back to). Steps already opened can be jumped to.
 */
export function SectionMenu({
  current,
  onGoTo,
  reached,
  details,
  className,
}: {
  current: number;
  onGoTo?: (index: number) => void;
  /** The furthest section the counsellor has opened. Later ones stay locked. */
  reached?: number;
  /** Values shown under each section dot. Only used on the last step. */
  details?: { label: string; value: string }[][];
  className?: string;
}) {
  const furthest = Math.max(reached ?? current, current);
  return (
    <ol className={className ? `${styles.sections} ${className}` : styles.sections}>
      {SECTIONS.map((section, index) => {
        const open = Boolean(onGoTo) && index !== current && index <= furthest;
        // Visited sections keep their check when the counsellor jumps back.
        const done = index !== current && index <= furthest;
        const mark = done ? styles.doneMark : styles.mark;
        const lines = details?.[index] ?? [];
        return (
          <li
            key={section}
            className={index === current ? styles.current : undefined}
            aria-current={index === current ? 'step' : undefined}
          >
            {open && onGoTo ? (
              <button type="button" className={styles.jump} onClick={() => onGoTo(index)}>
                <span className={mark} aria-hidden="true" />
                {section}
              </button>
            ) : (
              <span className={styles.sectionLine}>
                <span className={mark} aria-hidden="true" />
                {section}
              </span>
            )}
            {lines.length > 0 && (
              <dl className={styles.under}>
                {lines.map((line) => (
                  <div key={line.label} className={styles.underRow}>
                    <dt>{line.label}</dt>
                    <dd>{line.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Chosen when the counsellor explicitly skips a template or an industry. */
export const NO_TEMPLATE = 'ingen';

function stillingComplete(value: Workplace): boolean {
  return (
    value.jobTitle.trim() !== '' &&
    value.templateId !== null &&
    value.industry !== '' &&
    value.sector !== null
  );
}

function stillingChoiceLines(
  value: Workplace,
  templates: IndustryTemplate[],
): { label: string; value: string }[] {
  const jobTemplate =
    value.templateId === NO_TEMPLATE
      ? 'Ingen mal er valgt, så intervjueren får ingen stillingsbeskrivelse.'
      : (templates.find((item) => item.id === value.templateId)?.title ?? '');
  let employer = '';
  if (value.sector === 'ikke-oppgitt') employer = 'Ikke oppgitt';
  else if (value.sector === 'offentlig' || value.sector === 'privat') {
    employer = SECTOR_LABELS[value.sector];
  }
  return [
    { label: 'Stilling', value: value.jobTitle.trim() },
    { label: 'Stillingsmal', value: jobTemplate },
    {
      label: 'Bransje',
      value: value.industry === NO_TEMPLATE ? 'Ingen bransje' : value.industry,
    },
    { label: 'Arbeidsgiver', value: employer },
    { label: 'Bedrift', value: value.company.trim() },
  ];
}

function RequiredMark() {
  return (
    <span className={styles.required} aria-hidden="true">
      {' '}
      *
    </span>
  );
}

/**
 * The first screen of a new interviewer, laid out like draft A without the stepper across the
 * top. The section list is the slim one from draft C.
 */
export function StillingStep({
  value,
  templates,
  industries,
  onChange,
  onNext,
  onGoTo,
  reached,
  onSaveDraft,
}: StillingStepProps) {
  const [showAllJobs, setShowAllJobs] = useState(false);
  const [showAllIndustries, setShowAllIndustries] = useState(false);
  const suggestions = showAllJobs ? templates : templates.slice(0, SUGGESTION_COUNT);
  // The chosen industry stays in view, also when a stillingsmal chose one further down the list.
  const shownIndustries = showAllIndustries
    ? industries
    : industries.filter(
        (industry, index) => index < SUGGESTION_COUNT || industry === value.industry,
      );

  /**
   * Chooses the stillingsmal and fills in its job title, industry and employer. A job title the
   * counsellor wrote themselves is kept; one a stillingsmal filled in is replaced.
   */
  function pickTemplate(template: IndustryTemplate) {
    const previous = templates.find((item) => item.id === value.templateId);
    const title = value.jobTitle.trim();
    const ownTitle = title !== '' && title !== previous?.title;
    onChange({
      ...value,
      templateId: template.id,
      jobTitle: ownTitle ? value.jobTitle : template.title,
      industry: template.industry,
      sector: template.sector,
    });
  }

  return (
    <WizardFrame current={0} onGoTo={onGoTo} reached={reached}>
      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          if (!stillingComplete(value)) return;
          onNext();
        }}
      >
        <h2 className={styles.question}>Hvilken stilling skal jobbsøkeren øve til?</h2>
        <p className={styles.hint}>Feltene med stjerne må fylles ut før du kan gå videre.</p>

        <TextField
          label="Stilling"
          value={value.jobTitle}
          onChange={(event) => onChange({ ...value, jobTitle: event.target.value })}
          required
          fullWidth
        />

        <div className={styles.suggestions}>
          <div className={helpStyles.row}>
            <p className={styles.suggestionLabel} id="job-templates-label">
              Stillingsmaler
              <RequiredMark />
            </p>
            <FieldHelp
              label="Stillingsmaler"
              description="En stillingsmal fyller inn stilling, bransje og arbeidsgiver. Du kan endre dem etterpå."
            />
          </div>
          <p className={styles.hint}>
            En stillingsmal fyller inn stilling, bransje og arbeidsgiver for deg. Du kan endre dem
            etterpå.
          </p>
          <div className={styles.pills} role="group" aria-labelledby="job-templates-label">
            <Button
              type="button"
              size="small"
              variant={value.templateId === NO_TEMPLATE ? 'contained' : 'outlined'}
              aria-pressed={value.templateId === NO_TEMPLATE}
              onClick={() => onChange({ ...value, templateId: NO_TEMPLATE })}
            >
              Ingen mal
            </Button>
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
          <div className={helpStyles.row}>
            <p className={styles.suggestionLabel} id="industry-label">
              Bransje
              <RequiredMark />
            </p>
            <FieldHelp
              label="Bransje"
              description="Hvilken bransje stillingen er i, for eksempel helse eller varehandel."
            />
          </div>
          <div className={styles.pills} role="group" aria-labelledby="industry-label">
            <Button
              type="button"
              size="small"
              variant={value.industry === NO_TEMPLATE ? 'contained' : 'outlined'}
              aria-pressed={value.industry === NO_TEMPLATE}
              onClick={() => onChange({ ...value, industry: NO_TEMPLATE })}
            >
              Ingen bransje
            </Button>
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
          <div className={helpStyles.row}>
            <span className={styles.suggestionLabel} id="employer-label">
              Arbeidsgiver
              <RequiredMark />
            </span>
            <FieldHelp
              label="Arbeidsgiver"
              description="Om arbeidsgiveren er offentlig, privat, eller ikke oppgitt."
            />
          </div>
          <ToggleButtonGroup
            exclusive
            size="small"
            className={styles.sector}
            value={value.sector}
            aria-labelledby="employer-label"
            onChange={(_event, sector: Employer | null) => {
              if (sector) onChange({ ...value, sector });
            }}
          >
            <ToggleButton value="offentlig">{SECTOR_LABELS.offentlig}</ToggleButton>
            <ToggleButton value="privat">{SECTOR_LABELS.privat}</ToggleButton>
            <ToggleButton value="ikke-oppgitt">Ikke oppgitt</ToggleButton>
          </ToggleButtonGroup>
        </div>

        <div className={styles.fieldWithHelp}>
          <TextField
            label="Bedrift (valgfritt)"
            value={value.company}
            onChange={(event) => onChange({ ...value, company: event.target.value })}
            helperText="Du kan hoppe over dette. Intervjueren bruker da en generell bedrift."
            fullWidth
          />
          <FieldHelp
            label="Bedrift"
            description="Navnet på bedriften intervjuet er hos. Valgfritt. Uten navn bruker intervjueren en generell bedrift."
          />
        </div>

        <ChoiceSummary lines={stillingChoiceLines(value, templates)} />
        <WizardNav
          backHref="/browse-agents"
          nextSubmit
          nextDisabled={!stillingComplete(value)}
          onSaveDraft={onSaveDraft}
        />
      </form>
    </WizardFrame>
  );
}
