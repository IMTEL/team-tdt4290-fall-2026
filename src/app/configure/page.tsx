import type { Metadata } from 'next';
import Link from 'next/link';

import { ConfigurationChat } from './ConfigurationChat';
import styles from './page.module.css';
import Button from '@mui/material/Button';

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
        <Link href="/template-picker" className={styles.templateLink}>
          <Button variant="contained">Velg en mal</Button>
        </Link>
      </header>

      <ConfigurationChat />
    </div>
  );
}
