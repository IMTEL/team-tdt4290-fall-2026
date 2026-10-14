'use client';

import { DeleteAgentButton } from './DeleteAgentButton';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { AnswerList } from '@/components/agents/AnswerList';
import { readStoredAnswers } from '@/domain/agentTypes/storedAnswers';

import { useAgent } from '../useAgent';

/** One saved agent: the configuration as a list, and the system prompt closed until opened. */
export function AgentDetail({ agentId }: { agentId: string }) {
  const state = useAgent(agentId);

  if (state.kind === 'missing') notFound();

  if (state.kind === 'loading') {
    return <Typography>Laster agent …</Typography>;
  }

  if (state.kind === 'error') {
    return <Alert severity="error">Noe gikk galt. Prøv igjen.</Alert>;
  }

  if (state.kind !== 'ready') return null;

  // Knows the old and the new way of storing answers, and works for every agent type.
  const stored = readStoredAnswers(state.agent.description);

  return (
    <Box sx={{ p: 3, maxWidth: 720 }}>
      <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
        {state.agent.name}
      </Typography>

      {stored ? (
        <AnswerList fields={stored.definition.fields} answers={stored.answers} />
      ) : (
        <Typography variant="body1">{state.agent.description}</Typography>
      )}

      {stored && (
        <Accordion sx={{ mt: 3 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography component="span">Systemprompt</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography component="pre" variant="body2" sx={{ whiteSpace: 'pre-wrap', m: 0 }}>
              {stored.definition.buildPrompt(stored.answers)}
            </Typography>
          </AccordionDetails>
        </Accordion>
      )}

      <Stack direction="row" spacing={1} sx={{ mt: 3 }}>
        <Button
          component={Link}
          href={`/test-chat?agent=${encodeURIComponent(state.agent.id)}`}
          variant="contained"
        >
          Test agenten
        </Button>
        {/* Only agents made in this app have answers that can be edited or cloned. */}
        {stored && (
          <Button
            component={Link}
            href={`/browse-agents/${state.agent.id}/edit`}
            variant="outlined"
          >
            Rediger
          </Button>
        )}
        {stored && (
          <Button
            component={Link}
            href={`/browse-agents/${state.agent.id}/clone`}
            variant="outlined"
          >
            Klon
          </Button>
        )}
        <DeleteAgentButton agent={state.agent} />
      </Stack>
    </Box>
  );
}
