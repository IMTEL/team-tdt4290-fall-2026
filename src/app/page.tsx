import { Button } from '@/components/ui/Buttons';
import styles from './page.module.css';

export default function Home() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Interviewer Agent Configurator</h1>
      <p className={styles.lead}>
        Configure AI interviewer agents, try them out in a chat, and publish them to the VR app The
        Candidate.
      </p>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Design tokens</h2>
        <p className={styles.cardText}>
          These buttons read their colours from the theme, so they follow light and dark mode
          automatically.
        </p>
        <div className={styles.actions}>
          <Button>Default</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="secondary">Secondary</Button>
        </div>
      </section>
    </div>
  );
}
