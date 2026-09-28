import type { Metadata } from 'next';

import { TestChat } from './TestChat';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Test intervjuer',
  description: 'Test AI-intervjueren før jobbsøkere bruker den.',
};

export default function TestChatPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Test intervjueren</h1>
        <p className={styles.lead}>
          {/* English translation: Talk to the interviewer the way a job seeker would, and check
          that it asks questions and behaves the way you want. */}
          Snakk med intervjueren slik en jobbsøker ville gjort, og sjekk at den stiller spørsmål og
          oppfører seg slik du ønsker.
        </p>
      </header>

      <TestChat />
    </div>
  );
}
