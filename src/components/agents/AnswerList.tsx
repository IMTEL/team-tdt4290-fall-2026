import Typography from '@mui/material/Typography';

import type { AgentField, Answers } from '@/domain/agentTypes/types';
import styles from './AnswerList.module.css';

type AnswerListProps = {
  fields: AgentField[];
  answers: Answers;
};

/** An agent's configuration as a list of labels and answers, in the order of the fields. */
export function AnswerList({ fields, answers }: AnswerListProps) {
  return (
    <dl className={styles.list}>
      {fields.map(({ key, label }) => (
        <div key={key}>
          <Typography component="dt" variant="subtitle2">
            {label}
          </Typography>
          <Typography component="dd" className={styles.answer}>
            {/* Empty when nothing was added, or the field is newer than the agent. */}
            {answers[key] || '–'}
          </Typography>
        </div>
      ))}
    </dl>
  );
}
