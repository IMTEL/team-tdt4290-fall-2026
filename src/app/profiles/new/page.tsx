import type { Metadata } from 'next';

import { CreateProfileForm } from './CreateProfileForm';
import styles from '../page.module.css';

export const metadata: Metadata = {
  title: 'Lag en jobbsøkerprofil',
};

export default function NewProfilePage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Lag en jobbsøkerprofil</h1>
        <p className={styles.lead}>
          {/* English translation: Describe the job seeker without personal data: no name, exact
          age or diagnoses. Only fill in what you know. */}
          Beskriv jobbsøkeren uten personopplysninger: ikke navn, nøyaktig alder eller diagnoser.
          Fyll bare ut det du vet.
        </p>
      </header>

      <CreateProfileForm />
    </div>
  );
}
