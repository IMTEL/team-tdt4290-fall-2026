import type { Metadata } from 'next';

import { ConfigureAgent } from './ConfigureAgent';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Sett opp en agent',
  description: 'Sett opp en AI-agent, for eksempel en intervjuer, som jobbsøkere kan øve med.',
};

type ConfigurePageProps = { searchParams: Promise<{ type?: string | string[]; step?: string | string[] }> };

/** `?type=<id>` skips the type step, as the «Ny agent» dialog on the agents page does. */
export default async function ConfigurePage({ searchParams }: ConfigurePageProps) {
  const { type, step } = await searchParams;
  const typeId = typeof type === 'string' ? type : null;
  const stepId = typeof step === 'string' ? step : null;

  return (
    <div className={typeId === 'interviewer' ? styles.wizard : styles.page}>
      <ConfigureAgent initialTypeId={typeId} initialStep={stepId} />
    </div>
  );
}
