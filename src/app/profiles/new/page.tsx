import type { Metadata } from 'next';

import { returnPath } from '@/lib/returnTo';
import { CreateProfileForm } from './CreateProfileForm';
import styles from '../page.module.css';

export const metadata: Metadata = {
  title: 'Lag en jobbsøkermal',
};

export default async function NewProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const { returnTo } = await searchParams;
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Lag en jobbsøkermal</h1>
        <p className={styles.lead}>
          {/* English translation: Describe the job seeker without personal data: no name, exact
          age or diagnoses. Only fill in what you know. */}
          Beskriv jobbsøkeren uten personopplysninger: ikke navn, nøyaktig alder eller diagnoser.
          Fyll bare ut det du vet.
        </p>
      </header>

      <CreateProfileForm cancelHref={returnPath(returnTo) ?? '/templates'} />
    </div>
  );
}
