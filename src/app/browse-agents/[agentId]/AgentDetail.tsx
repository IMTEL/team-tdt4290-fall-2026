'use client';

import { useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import type { Agent } from '@/lib/types';
import { fetchAgents } from '../api';

type DetailState =
  { kind: 'loading' } | { kind: 'ready'; agent: Agent } | { kind: 'missing' } | { kind: 'error' };

/** Name and description of one of the counsellor's agents, looked up in the same list. */
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

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
        {state.agent.name}
      </Typography>
      <Typography variant="body1">{state.agent.description}</Typography>
    </Box>
  );
}
