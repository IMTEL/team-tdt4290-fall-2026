'use client';

import Link from 'next/link';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';

import { LEGAL_TEMPLATE_LIMITS, type LegalTemplate } from '@/domain/legalTemplate';
import styles from './LegalTemplateSelect.module.css';

type LegalTemplateSelectProps = {
  /** The built-in templates first, then the counsellor's own. */
  templates: LegalTemplate[];
  /** The chosen templates' ids, in the order they were chosen. */
  value: string[];
  onChange: (ids: string[]) => void;
};

/** Lets the counsellor choose the legal templates the interviewer must follow, before the chat. */
export function LegalTemplateSelect({ templates, value, onChange }: LegalTemplateSelectProps) {
  const full = value.length >= LEGAL_TEMPLATE_LIMITS.perAgent;

  function toggle(id: string, checked: boolean) {
    onChange(checked ? [...value, id] : value.filter((item) => item !== id));
  }

  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>Lovverk</legend>
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
                  disabled={!checked && full}
                  onChange={(event) => toggle(template.id, event.target.checked)}
                />
              }
            />
          );
        })}
      </div>
      <FormHelperText>
        {full
          ? `Du kan velge høyst ${LEGAL_TEMPLATE_LIMITS.perAgent}.`
          : 'Intervjueren følger lovverket du velger, og kan svare jobbsøkeren om rettighetene ' +
            'sine. Valgfritt.'}
      </FormHelperText>
      <Link href="/legal-templates" className={styles.link}>
        Administrer lovverk
      </Link>
    </fieldset>
  );
}
