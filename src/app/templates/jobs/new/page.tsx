import type { Metadata } from 'next';

import styles from '../../formPage.module.css';
import { CreateJobTemplate } from './CreateJobTemplate';

export const metadata: Metadata = {
  title: 'Ny stillingsmal',
};

export default function NewJobTemplatePage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Ny stillingsmal</h1>
        <p className={styles.lead}>
          {/* English translation: A job template fills in the job and the industry when you set
          up an interviewer. Describe the job in general terms; only you can see your templates. */}
          En stillingsmal fyller inn stilling og bransje når du setter opp en intervjuer. Beskriv
          stillingen generelt. Bare du ser malene dine.
        </p>
      </header>

      <CreateJobTemplate />
    </div>
  );
}
