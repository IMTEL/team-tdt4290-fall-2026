import type { Metadata } from 'next';
import Link from 'next/link';

import { TemplateChoice } from './TemplateChoice';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Velg mal',
  description: 'Velg en mal som utgangspunkt for AI-intervjueren.',
};

export default function TemplatePickerPage() {
  return (
    <div className={styles.page}>
      <Link href="/configure" className={styles.link}>
        ← Tilbake til samtalen
      </Link>
      <h1 className={styles.title}>Sett opp en intervjuer</h1>
      <TemplateChoice />
    </div>
  );
}
