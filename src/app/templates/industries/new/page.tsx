import type { Metadata } from 'next';

import styles from '../../formPage.module.css';
import { CreateIndustryTemplate } from './CreateIndustryTemplate';

export const metadata: Metadata = {
  title: 'Ny bransjemal',
};

export default function NewIndustryTemplatePage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Ny bransjemal</h1>
        <p className={styles.lead}>
          {/* English translation: An industry template gathers jobs in the same industry. You can
          choose it when you set up an interviewer and when you make a job template. */}
          En bransjemal samler stillinger i samme bransje. Du kan velge den når du setter opp en
          intervjuer og når du lager en stillingsmal.
        </p>
      </header>

      <CreateIndustryTemplate />
    </div>
  );
}
