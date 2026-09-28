import type { Metadata } from 'next';

import { ConfigurationChat } from './ConfigurationChat';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Konfigurer intervjuer',
  description: 'Sett opp en AI-intervjuer som jobbsøkere kan øve jobbintervju med.',
};

export default function ConfigurePage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Sett opp en intervjuer</h1>
        <p className={styles.lead}>
          {/* English translation: Answer the questions from the assistant, and we will
          create an AI interviewer that job seekers can practice with. */}
          Svar på spørsmålene fra assistenten, så lager vi en AI-intervjuer som jobbsøkeren kan øve
          med.
        </p>
      </header>

      <ConfigurationChat />
    </div>
  );
}
