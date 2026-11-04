import type { Metadata } from 'next';

import { CreateLegalTemplateForm } from './CreateLegalTemplateForm';
import styles from '../page.module.css';

export const metadata: Metadata = {
  title: 'Legg til lovverk',
};

export default function NewLegalTemplatePage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Legg til lovverk</h1>
        <p className={styles.lead}>
          {/* English translation: Write the law or rule in your own words, as the interviewer
          should follow it. Check that it is right: the interviewer only knows what you write. */}
          Huk av lovene intervjueren skal følge, og fjern krysset for det du vil vrake. Intervjueren
          vet bare det som blir med.
        </p>
      </header>

      <CreateLegalTemplateForm />
    </div>
  );
}
