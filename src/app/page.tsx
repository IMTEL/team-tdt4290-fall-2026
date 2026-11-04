import Link from 'next/link';

import styles from './page.module.css';

const STEPS = [
  {
    title: 'Lag en agent',
    text: 'Trykk på «Ny agent» og svar på spørsmål om stilling, intervjuer, jobbsøkermal og innstillinger.',
  },
  {
    title: 'Du kan teste agenten',
    text: 'Trykk på «Test agenten» og snakk med agenten slik en jobbsøker ville gjort.',
  },
  {
    title: 'Publiser agenten',
    text: 'Trykk på «Publiser» og skriv navn og en kort beskrivelse. Da blir agenten tilgjengelig i The Candidate, og du finner den under Agenter.',
  },
] as const;

export default function Home() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>
        Lag AI-intervjuere <span className={styles.line}>for jobbsøkere</span>
      </h1>
      <p className={styles.lead}>
        {/* English translation: Set up an interviewer, try it in a chat, and publish it to the VR
        app The Candidate. */}
        Sett opp en intervjuer, test den i en chat og publiser den til VR-appen The Candidate.
      </p>
      <div className={styles.actions}>
        <Link href="/configure?type=interviewer&new=1" className={styles.primary}>
          Ny agent
        </Link>
        <Link href="/browse-agents" className={styles.secondary}>
          Se agentene dine
        </Link>
      </div>

      <Link href="/templates" className={styles.templatesLink}>
        <span className={styles.templatesTitle}>
          Maler
          <span aria-hidden="true"> →</span>
        </span>
        <span className={styles.templatesHint}>
          Stillings-, bransje- og jobbsøkermaler. Velg en når du setter opp agenten, så er mye
          allerede fylt inn.
        </span>
      </Link>

      <section className={styles.how} aria-labelledby="how-heading">
        <h2 id="how-heading" className={styles.howTitle}>
          Slik fungerer det
        </h2>
        <ol className={styles.steps}>
          {STEPS.map((step, index) => (
            <li key={step.title} className={styles.step}>
              <div className={styles.stepHead}>
                <span className={styles.number} aria-hidden="true">
                  {index + 1}
                </span>
                <h3 className={styles.stepTitle}>{step.title}</h3>
              </div>
              <p className={styles.stepText}>{step.text}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
