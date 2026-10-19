import type { Metadata } from 'next';
import Link from 'next/link';

import { TestChat } from './TestChat';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Test intervjuer',
  description: 'Test AI-intervjueren før jobbsøkere bruker den.',
};

type Props = { searchParams: Promise<{ agent?: string | string[] }> };

/** Chats with the saved agent in `?agent=<id>`, the way a job seeker would. */
export default async function TestChatPage({ searchParams }: Props) {
  const { agent } = await searchParams;
  // `?agent=a&agent=b` gives an array; take the first one.
  const agentId = Array.isArray(agent) ? agent[0] : agent;

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

      {agentId ? (
        <TestChat agentId={agentId} />
      ) : (
        <p className={styles.empty}>
          {/* English translation: Choose which interviewer to test from your agents. */}
          Velg hvilken intervjuer du vil teste fra <Link href="/browse-agents">agentene dine</Link>.
        </p>
      )}
    </div>
  );
}
