'use client';

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
import Typography from '@mui/material/Typography';

import { configurationFields, readStoredConfiguration } from '@/domain/configuration';
import { buildPrompt } from '@/domain/interviewerPrompt';
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

  const configuration = readStoredConfiguration(state.agent.description);

  return (
    <Box sx={{ p: 3, maxWidth: 720 }}>
      <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
        {state.agent.name}
      </Typography>

      {configuration ? (
        <Box component="dl" sx={{ m: 0 }}>
          {configurationFields(configuration).map(({ label, value }) => (
            <Box key={label} sx={{ mb: 1.5 }}>
              <Typography component="dt" variant="subtitle2">
                {label}
              </Typography>
              <Typography component="dd" sx={{ m: 0 }}>
                {value}
              </Typography>
            </Box>
          ))}
        </Box>
      ) : (
        <Typography variant="body1">{state.agent.description}</Typography>
      )}

      {configuration && (
        <Accordion sx={{ mt: 3 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography component="span">Systemprompt</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography component="pre" variant="body2" sx={{ whiteSpace: 'pre-wrap', m: 0 }}>
              {buildPrompt(configuration)}
            </Typography>
          </AccordionDetails>
        </Accordion>
      )}

      <Button component={Link} href="/test-chat" variant="contained" sx={{ mt: 3 }}>
        Test agenten
      </Button>
    </Box>
  );
}
