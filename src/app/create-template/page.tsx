import type { Metadata } from 'next';

import { CreateTemplateForm } from './CreateTemplateForm';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Lag en mal',
  description: 'Lag en mal for en intervjuer som du kan bruke når du setter opp en AI-intervjuer.',
};

export default function CreateTemplatePage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Lag en mal til å konfigurere en AI-agent</h1>
        <p className={styles.lead}>
          {/* English translation: A template describes the interviewer. You will find it among
          the templates when you set up a new interviewer. Only you can see your templates. */}
          En mal beskriver intervjueren. Du finner den blant malene når du setter opp en ny
          intervjuer. Bare du ser malene dine.
        </p>
      </header>

      <CreateTemplateForm />
    </div>
  );
}
