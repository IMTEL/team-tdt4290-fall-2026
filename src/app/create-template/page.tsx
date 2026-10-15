import type { Metadata } from 'next';

import { CreateTemplateForm } from './CreateTemplateForm';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Lag en mal',
  description:
    'Lag en mal som du kan bruke når du setter opp en AI-agent, for eksempel en intervjuer.',
};

type CreateTemplatePageProps = { searchParams: Promise<{ agentType?: string | string[] }> };

/** `?agentType=<id>` chooses the agent type to start with, as the link on /configure does. */
export default async function CreateTemplatePage({ searchParams }: CreateTemplatePageProps) {
  const { agentType } = await searchParams;
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Lag en mal til å konfigurere en AI-agent</h1>
        <p className={styles.lead}>
          {/* English translation: A template describes part of an agent, such as the
          interviewer. Choose what kind of agent it is for, and you will find it among the
          templates when you set up such an agent. Only you can see your templates. */}
          En mal beskriver en del av en agent, for eksempel intervjueren. Velg hva slags agent den
          er for, så finner du den blant malene når du setter opp en slik agent. Bare du ser malene
          dine.
        </p>
      </header>

      <CreateTemplateForm agentType={typeof agentType === 'string' ? agentType : null} />
    </div>
  );
}
