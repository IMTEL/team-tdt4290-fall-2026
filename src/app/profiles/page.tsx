import type { Metadata } from 'next';

import { NewProfileButton } from '@/components/profiles/NewProfileButton';
import { ProfileList } from '@/components/profiles/ProfileList';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Jobbsøkerprofiler',
  description: 'Anonyme profiler av jobbsøkere, til bruk når du setter opp en AI-intervjuer.',
};

export default function ProfilesPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Jobbsøkerprofiler</h1>
        <p className={styles.lead}>
          {/* English translation: A profile describes a kind of job seeker: age, experience,
          languages and what they want to practise. Choose it when you set up an interviewer, and
          the interviewer adapts to it. Only you can see your profiles. */}
          En profil beskriver en type jobbsøker: alder, erfaring, språk og hva de vil øve på. Velg
          den når du setter opp en intervjuer, så tilpasser intervjueren seg. Bare du ser profilene
          dine.
        </p>
        <NewProfileButton />
      </header>

      <ProfileList />
    </div>
  );
}
