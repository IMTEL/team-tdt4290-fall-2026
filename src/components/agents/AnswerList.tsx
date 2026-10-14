import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import type { AgentField, Answers } from '@/domain/agentTypes/types';

type AnswerListProps = {
  fields: AgentField[];
  answers: Answers;
};

/** An agent's configuration as a list of labels and answers, in the order of the fields. */
export function AnswerList({ fields, answers }: AnswerListProps) {
  return (
    <Box component="dl" sx={{ m: 0 }}>
      {fields.map(({ key, label }) => (
        <Box key={key} sx={{ mb: 1.5 }}>
          <Typography component="dt" variant="subtitle2">
            {label}
          </Typography>
          <Typography component="dd" sx={{ m: 0, whiteSpace: 'pre-wrap' }}>
            {/* Empty when nothing was added, or the field is newer than the agent. */}
            {answers[key] || '–'}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
