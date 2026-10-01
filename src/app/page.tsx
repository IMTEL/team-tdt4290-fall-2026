import styles from './page.module.css';

export default function Home() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Konfigurator for intervjuagenter</h1>
      <p className={styles.lead}>
        {/* English translation: Set up AI interviewers, try them out in a chat, and publish them to
        the VR app The Candidate. */}
        Sett opp AI-intervjuere, test dem i en chat og publiser dem til VR-appen The Candidate.
      </p>
    </div>
  );
}
