'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
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

  const { agent } = state;
  const stored = readStoredAnswers(agent.description);

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 960, mx: 'auto' }}>
      <Button
        component={Link}
        href={`/browse-agents/${agent.id}`}
        startIcon={<ArrowBackIcon />}
        size="small"
        sx={{ mb: 2 }}
      >
        Tilbake til agenten
      </Button>

      <Typography variant="h4" component="h1">
        Rediger agent
      </Typography>
      <Stack direction="row" spacing={1} sx={{ mt: 1, mb: 3, alignItems: 'center' }}>
        <Typography color="text.secondary">{agent.name}</Typography>
        {stored && <Chip label={stored.definition.label} size="small" color="secondary" />}
      </Stack>

      {stored ? (
        <EditAgentForm
          agentId={agent.id}
          initialName={agent.name}
          definition={stored.definition}
          initialAnswers={stored.answers}
        />
      ) : (
        <Alert severity="info">Denne agenten ble ikke laget her, og kan ikke redigeres.</Alert>
      )}
    </Box>
  );
}
