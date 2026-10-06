import type { Metadata } from 'next';

import { ConfigureInterviewer } from './ConfigureInterviewer';
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
          {/* English translation: Choose a template, then answer the questions from the assistant,
          and we will create an AI interviewer that job seekers can practice with. */}
          Velg en mal, og svar så på spørsmålene fra assistenten. Da lager vi en AI-intervjuer som
          jobbsøkeren kan øve med.
        </p>
      </header>

      <ConfigureInterviewer />
    </div>
  );
}
