'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

import styles from './TemplateDetail.module.css';

/** The text for a template that comes with the app, and can't be changed or deleted. */
export const BUILT_IN_LABEL = 'Følger med appen';

/** One labelled row on a template's page: a text, pills, or links to other pages. */
export type TemplateDetailField = {
  label: string;
  /** Kept with its line breaks. A dash when empty. */
  text?: string;
  chips?: string[];
  links?: { href: string; label: string }[];
};

type TemplateDetailProps = {
  title: string;
  /** Whose template it is, such as «Følger med appen» or «Egen mal». Shown as a pill. */
  chip: string;
  /** What the template is for, in a box under the title. */
  summary?: { label: string; text: string };
  /** Edit and delete, for the counsellor's own templates. Built-in ones have none. */
  actions?: ReactNode;
  fields: TemplateDetailField[];
};

/**
 * One template on its own page, like an agent's page: a link back to Maler, the title and whose it
 * is, what it is for, the buttons, then what it holds. Each kind of template fills it in.
 */
export function TemplateDetail({ title, chip, summary, actions, fields }: TemplateDetailProps) {
  return (
    <TemplateDetailPage>
      <div className={styles.header}>
        <Typography variant="h4" component="h1">
          {title}
        </Typography>
        <div className={styles.meta}>
          <Chip label={chip} size="small" color="secondary" />
        </div>
      </div>

      {summary?.text && (
        <Paper
          component="section"
          variant="outlined"
          aria-labelledby="summary-heading"
          className={styles.summary}
        >
          <Typography
            id="summary-heading"
            variant="overline"
            component="h2"
            className={styles.summaryLabel}
          >
            {summary.label}
          </Typography>
          <Typography variant="body1">{summary.text}</Typography>
        </Paper>
      )}

      {actions && <div className={styles.actions}>{actions}</div>}

      <dl className={styles.fields}>
        {fields.map((field) => (
          <div key={field.label}>
            <Typography component="dt" variant="subtitle2">
              {field.label}
            </Typography>
            <FieldValue field={field} />
          </div>
        ))}
      </dl>
    </TemplateDetailPage>
  );
}

function FieldValue({ field }: { field: TemplateDetailField }) {
  if (field.chips && field.chips.length > 0) {
    return (
      <dd className={styles.chips}>
        {field.chips.map((chip) => (
          <Chip key={chip} label={chip} size="small" />
        ))}
      </dd>
    );
  }
  if (field.links && field.links.length > 0) {
    return (
      <dd className={styles.value}>
        <ul className={styles.links}>
          {field.links.map((link) => (
            <li key={link.href}>
              <Link href={link.href}>{link.label}</Link>
            </li>
          ))}
        </ul>
      </dd>
    );
  }
  return (
    <Typography component="dd" className={styles.value}>
      {field.text?.trim() || '–'}
    </Typography>
  );
}

/** The page around a template: the column and the link back to Maler. Also while it loads. */
export function TemplateDetailPage({ children }: { children: ReactNode }) {
  return (
    <div className={styles.page}>
      {/* The margin is on a wrapper: MUI's own styles load after ours and reset its margin. */}
      <div className={styles.backLink}>
        <Button component={Link} href="/templates" startIcon={<ArrowBackIcon />} size="small">
          {/* English translation: Back to the templates */}
          Tilbake til malene
        </Button>
      </div>
      {children}
    </div>
  );
}

/** The shape of the page while a template loads, so the page does not jump when it arrives. */
export function TemplateDetailSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label}>
      <Skeleton variant="text" width="70%" height={48} />
      <Skeleton variant="text" width="30%" />
      <Skeleton variant="rounded" height={88} className={styles.skeletonBlock} />
      <Skeleton variant="rounded" height={200} className={styles.skeletonBlock} />
    </div>
  );
}
