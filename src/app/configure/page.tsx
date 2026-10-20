import type { Metadata } from 'next';

import { ConfigureAgent } from './ConfigureAgent';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Sett opp en agent',
  description: 'Sett opp en AI-agent, for eksempel en intervjuer, som jobbsøkere kan øve med.',
};

type ConfigurePageProps = { searchParams: Promise<{ type?: string | string[] }> };

/** `?type=<id>` skips the type step, as the «Ny agent» dialog on the agents page does. */
export default async function ConfigurePage({ searchParams }: ConfigurePageProps) {
  const { type } = await searchParams;
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Sett opp en agent</h1>
        <p className={styles.lead}>
          {/* English translation: Choose what kind of agent to set up, then answer the questions
          from the assistant, and we will create an AI agent that job seekers can practice with.
          For an interviewer you can also choose templates for the interviewer and the industry,
          and a job seeker profile, or let the assistant ask you about everything. */}
          Velg hva slags agent du vil sette opp, og svar så på spørsmålene fra assistenten. Da lager
          vi en AI-agent som jobbsøkeren kan øve med. For en intervjuer kan du også velge maler for
          intervjueren og bransjen og en jobbsøkerprofil, eller la assistenten spørre deg om alt.
        </p>
      </header>

      <ConfigureAgent initialTypeId={typeof type === 'string' ? type : null} />
    </div>
  );
}
