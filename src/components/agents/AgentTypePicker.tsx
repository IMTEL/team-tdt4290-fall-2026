'use client';

import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Chip from '@mui/material/Chip';

import type { AgentTypeDefinition, PlannedAgentType } from '@/domain/agentTypes/types';
import styles from './AgentTypePicker.module.css';

type AgentTypePickerProps = {
  /** The types that can be set up. */
  types: AgentTypeDefinition[];
  /** Types that are coming, shown so counsellors see what is planned, but not choosable. */
  planned?: PlannedAgentType[];
  /**
   * Id of a heading that already asks the question, such as a dialog title. Without it, the
   * picker renders its own heading.
   */
  labelledBy?: string;
  onSelect: (definition: AgentTypeDefinition) => void;
};

/** The first step on /configure: what kind of agent to set up. */
export function AgentTypePicker({
  types,
  planned = [],
  labelledBy,
  onSelect,
}: AgentTypePickerProps) {
  return (
    <section aria-labelledby={labelledBy ?? 'agent-type-picker-heading'} className={styles.picker}>
      {!labelledBy && (
        <h2 id="agent-type-picker-heading" className={styles.heading}>
          Hva slags agent vil du sette opp?
        </h2>
      )}

      <ul className={styles.grid}>
        {types.map((definition) => (
          <li key={definition.id}>
            <Card variant="outlined" className={styles.card}>
              <CardActionArea onClick={() => onSelect(definition)} className={styles.action}>
                <h3 className={styles.title}>{definition.label}</h3>
                <p className={styles.description}>{definition.description}</p>
              </CardActionArea>
            </Card>
          </li>
        ))}
        {planned.map((type) => (
          <li key={type.id}>
            {/* Not a button: there is nothing to choose yet. */}
            <Card variant="outlined" className={`${styles.card} ${styles.planned}`}>
              <div className={styles.action}>
                <h3 className={styles.title}>{type.label}</h3>
                <p className={styles.description}>{type.description}</p>
                <Chip label="Kommer snart" size="small" className={styles.soon} />
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
