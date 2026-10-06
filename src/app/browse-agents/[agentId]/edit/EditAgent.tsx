'use client';

import { useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { readStoredAnswers } from '@/domain/agentTypes/storedAnswers';
import type { Agent } from '@/lib/types';
import { fetchAgents } from '../../api';
import { EditAgentForm } from './EditAgentForm';

type LoadState =
  { kind: 'loading' } | { kind: 'ready'; agent: Agent } | { kind: 'missing' } | { kind: 'error' };

/** Loads one of the counsellor's agents and shows the form for editing it. */
export function EditAgent({ agentId }: { agentId: string }) {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

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
  if (state.kind === 'loading') return <Typography>Laster agent …</Typography>;
  if (state.kind === 'error') return <Alert severity="error">Noe gikk galt. Prøv igjen.</Alert>;
  if (state.kind !== 'ready') return null;

  const stored = readStoredAnswers(state.agent.description);

  return (
    <Box sx={{ p: 3, maxWidth: 720 }}>
      <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
        Rediger {state.agent.name}
      </Typography>
      {stored ? (
        <EditAgentForm
          agentId={state.agent.id}
          initialName={state.agent.name}
          definition={stored.definition}
          initialAnswers={stored.answers}
        />
      ) : (
        <Alert severity="info">Denne agenten ble ikke laget her, og kan ikke redigeres.</Alert>
      )}
    </Box>
  );
}
