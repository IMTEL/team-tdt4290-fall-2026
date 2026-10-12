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
          {/* English translation: Choose a template for the interviewer and one for the industry,
          then answer the questions from the assistant, and we will create an AI interviewer that
          job seekers can practice with. You can also continue without templates, and the
          assistant will ask the questions needed. */}
          Velg en mal for intervjueren og en for bransjen, og svar så på spørsmålene fra
          assistenten. Da lager vi en AI-intervjuer som jobbsøkeren kan øve med. Du kan også
          fortsette uten maler, og assistenten vil stille de nødvendige spørsmålene for deg.
        </p>
      </header>

      <ConfigureInterviewer />
    </div>
  );
}
