'use client';

import { DeleteAgentButton } from './DeleteAgentButton';
import { useEffect, useState } from 'react';
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

import { readStoredAnswers } from '@/domain/agentTypes/storedAnswers';
import type { Agent } from '@/lib/types';
import { fetchAgents } from '../api';

type DetailState =
  { kind: 'loading' } | { kind: 'ready'; agent: Agent } | { kind: 'missing' } | { kind: 'error' };

/** One saved agent: the configuration as a list, and the system prompt closed until opened. */
export function AgentDetail({ agentId }: { agentId: string }) {
  const [state, setState] = useState<DetailState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    fetchAgents()
      .then((agents) => {
        if (cancelled) return;
        const agent = agents.find((item) => item.id === agentId);
        setState(agent ? { kind: 'ready', agent } : { kind: 'missing' });
      })
      .catch(() => {
        if (!cancelled) setState({ kind: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [agentId]);

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
        <Box component="dl" sx={{ m: 0 }}>
          {stored.definition.fields.map(({ key, label }) => (
            <Box key={key} sx={{ mb: 1.5 }}>
              <Typography component="dt" variant="subtitle2">
                {label}
              </Typography>
              <Typography component="dd" sx={{ m: 0 }}>
                {/* Empty when the agent type got this field after the agent was saved. */}
                {stored.answers[key] || '–'}
              </Typography>
            </Box>
          ))}
        </Box>
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
        {/* Only agents made in this app have answers that can be edited. */}
        {stored && (
          <Button
            component={Link}
            href={`/browse-agents/${state.agent.id}/edit`}
            variant="outlined"
          >
            Rediger
          </Button>
        )}
        <DeleteAgentButton agent={state.agent} />
      </Stack>
    </Box>
  );
}
