import type { Metadata } from 'next';

import { LegalTemplateList } from '@/components/legalTemplates/LegalTemplateList';
import { NewLegalTemplateButton } from '@/components/legalTemplates/NewLegalTemplateButton';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Lovverk',
  description: 'Lover og regler om ansettelse, som AI-intervjueren skal følge.',
};

export default function LegalTemplatesPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Lovverk</h1>
        <p className={styles.lead}>
          {/* English translation: Write down the laws and rules that apply to job interviews, such
          as what the employer may not ask about. Choose them when you set up an interviewer: it
          follows them, and can tell the job seeker about their rights. Only you can see your own. */}
          Skriv ned lover og regler som gjelder i jobbintervjuer, for eksempel hva arbeidsgiveren
          ikke kan spørre om. Velg dem når du setter opp en intervjuer: den følger dem, og kan
          fortelle jobbsøkeren om rettighetene sine. Bare du ser ditt eget lovverk.
        </p>
        <NewLegalTemplateButton />
      </header>

      <LegalTemplateList />
    </div>
  );
}
