import type { Metadata } from 'next';
import type { ReactNode } from 'react';

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
              <dt id={termId(term)}>{term}</dt>
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
        <li key={index}>{linkTemplateTerms(step)}</li>
      ))}
    </ol>
  );
}

/** The anchor of a word in the glossary, e.g. `ord-intervjuermal`. */
function termId(term: string): string {
  return `ord-${term.toLowerCase().replace(/\s+/g, '-')}`;
}

/**
 * The kinds of templates in the glossary (Stillingsmal, Intervjuermal, …) and Lovverk, which is
 * listed with them on the templates page. Not «Mal» itself.
 */
const TEMPLATE_TERMS = HELP_TOPICS.flatMap((topic) => topic.terms ?? [])
  .map(({ term }) => term)
  .filter((term) => {
    const word = term.toLowerCase();
    return (word.endsWith('mal') && word !== 'mal') || word === 'lovverk';
  });

/** A term, also in the plural («bransjemaler»), as a whole word. */
const TEMPLATE_PATTERN = new RegExp(
  `(?<!\\p{L})(${TEMPLATE_TERMS.join('|')})(?:er)?(?!\\p{L})`,
  'giu',
);

/**
 * Links the first mention of each kind of template in a step to its entry in the glossary. Words
 * inside «…» are button names, so they stay plain text.
 */
function linkTemplateTerms(step: string): ReactNode {
  const nodes: ReactNode[] = [];
  const linked = new Set<string>();
  let last = 0;
  for (const match of step.matchAll(TEMPLATE_PATTERN)) {
    const before = step.slice(0, match.index);
    const insideQuotes = before.lastIndexOf('«') > before.lastIndexOf('»');
    const term = match[1].toLowerCase();
    if (insideQuotes || linked.has(term)) continue;
    linked.add(term);
    nodes.push(step.slice(last, match.index));
    nodes.push(
      <a key={match.index} href={`#${termId(term)}`} className={styles.termLink}>
        {match[0]}
      </a>,
    );
    last = match.index + match[0].length;
  }
  nodes.push(step.slice(last));
  return nodes;
}
