'use client';

import { useId } from 'react';
import Link from 'next/link';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';

import { templatesSectionHref } from '@/app/templates/sectionOpen';
import { FieldHelp } from '@/components/ui/FieldHelp';
import { LEGAL_TEMPLATE_LIMITS, type LegalTemplate } from '@/domain/legalTemplate';
import styles from './LegalTemplateSelect.module.css';

type LegalTemplateSelectProps = {
  /** The built-in templates first, then the counsellor's own. */
  templates: LegalTemplate[];
  /** The chosen templates' ids, in the order they were chosen. */
  value: string[];
  onChange: (ids: string[]) => void;
  /** Replaces the help under the checkboxes. The limit is added when it is reached. */
  helperText?: string;
  disabled?: boolean;
};

/** Lets the counsellor choose the legal templates the interviewer must follow. */
export function LegalTemplateSelect({
  templates,
  value,
  onChange,
  helperText,
  disabled = false,
}: LegalTemplateSelectProps) {
  const labelId = useId();
  const full = value.length >= LEGAL_TEMPLATE_LIMITS.perAgent;

  function toggle(id: string, checked: boolean) {
    onChange(checked ? [...value, id] : value.filter((item) => item !== id));
  }

  return (
    <fieldset className={styles.fieldset} disabled={disabled} aria-labelledby={labelId}>
      <legend className={styles.legend}>
        <span id={labelId}>Lovverk</span>
        <FieldHelp
          label="Lovverk"
          description="Lover og regler intervjueren skal følge, for eksempel hva den ikke skal spørre om. Valgfritt."
        />
      </legend>
      <div className={styles.options}>
        {templates.map((template) => {
          const checked = value.includes(template.id);
          return (
            <FormControlLabel
              key={template.id}
              label={template.title}
              control={
                <Checkbox
                  checked={checked}
                  disabled={disabled || (!checked && full)}
                  onChange={(event) => toggle(template.id, event.target.checked)}
                />
              }
            />
          );
        })}
      </div>
      <FormHelperText>
        {[
          helperText ??
            'Intervjueren følger lovverket du velger, og kan svare jobbsøkeren om rettighetene ' +
              'sine. Valgfritt.',
          full && `Du kan velge høyst ${LEGAL_TEMPLATE_LIMITS.perAgent}.`,
        ]
          .filter(Boolean)
          .join(' ')}
      </FormHelperText>
      <Link href={templatesSectionHref('lovverk')} scroll={false} className={styles.link}>
        Administrer lovverk
      </Link>
    </fieldset>
  );
}
