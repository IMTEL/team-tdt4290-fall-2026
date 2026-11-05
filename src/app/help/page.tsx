import type { Metadata } from 'next';

import { HELP_TOPICS, type HelpTopic } from './helpTopics';
import styles from './page.module.css';

export const metadata: Metadata = {
  // English translation: Help. Short explanations of how to make, test and publish an agent.
  title: 'Hjelp',
  description: 'Korte forklaringer på hvordan du lager, tester og publiserer en agent.',
};

/**
 * Open to everyone, also before logging in. Plain sections rather than accordions, so a link to
 * `/help#<id>` (the new agent form has one per section) lands on text that is already open.
 */
export default function HelpPage() {
  return (
    <div className={styles.page}>
      {/* English translation: Help */}
      <h1 id="top" className={styles.title}>
        Hjelp
      </h1>
      <p className={styles.lead}>
        {/* English translation: This page explains the words and features in the app. Use the
        contents below to go straight to what you need. */}
        Denne siden forklarer ord og funksjoner i appen. Bruk innholdslisten under for å gå rett til
        det du trenger.
      </p>

      {/* English translation: Contents */}
      <nav aria-label="Innhold" className={styles.contents}>
        <ul>
          {HELP_TOPICS.map((topic) => (
            <li key={topic.id}>
              <a href={`#${topic.id}`}>{topic.title}</a>
            </li>
          ))}
        </ul>
      </nav>

      {HELP_TOPICS.map((topic) => (
        <Topic key={topic.id} topic={topic} />
      ))}

      {/* A plain link, so it works without JavaScript and also moves focus to the top. */}
      <a href="#top" className={styles.toTop}>
        {/* English translation: To the top */}
        Til toppen ↑
      </a>
    </div>
  );
}

function Topic({ topic }: { topic: HelpTopic }) {
  const headingId = `${topic.id}-heading`;
  return (
    <section id={topic.id} aria-labelledby={headingId} className={styles.topic}>
      <h2 id={headingId} className={styles.topicTitle}>
        {topic.title}
      </h2>
      {topic.intro && <p className={styles.text}>{topic.intro}</p>}
      {topic.terms && (
        <dl className={styles.terms}>
          {topic.terms.map(({ term, meaning }) => (
            <div key={term} className={styles.term}>
              <dt>{term}</dt>
              <dd>{meaning}</dd>
            </div>
          ))}
        </dl>
      )}
      {topic.steps && <Steps steps={topic.steps} />}
      {topic.parts?.map((part) => (
        <section
          key={part.id}
          id={part.id}
          aria-labelledby={`${part.id}-heading`}
          className={styles.part}
        >
          <h3 id={`${part.id}-heading`} className={styles.partTitle}>
            {part.title}
          </h3>
          <Steps steps={part.steps} />
        </section>
      ))}
      {topic.note && <p className={styles.note}>{topic.note}</p>}
    </section>
  );
}

function Steps({ steps }: { steps: string[] }) {
  return (
    <ol className={styles.steps}>
      {/* The steps are fixed text that never reorders, so the position is a stable key. */}
      {steps.map((step, index) => (
        <li key={index}>{step}</li>
      ))}
    </ol>
  );
}
