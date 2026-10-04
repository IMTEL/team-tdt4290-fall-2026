'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { AgentsTable } from '@/components/agents/AgentsTable';
import type { Agent } from '@/lib/types';
import { fetchAgents } from './api';

type ListState = { kind: 'loading' } | { kind: 'ready'; agents: Agent[] } | { kind: 'error' };

/** The counsellor's agents. An empty list and a failed request are different states. */
export function AgentList() {
  const [state, setState] = useState<ListState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    fetchAgents()
      .then((agents) => {
        if (!cancelled) setState({ kind: 'ready', agents });
      })
      .catch(() => {
        if (!cancelled) setState({ kind: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.kind === 'loading') {
    return <Typography>Laster agenter …</Typography>;
  }

  if (state.kind === 'error') {
    return <Alert severity="error">Noe gikk galt. Prøv igjen.</Alert>;
  }

  if (state.agents.length === 0) {
    return (
      <Typography>
        Du har ingen agenter ennå. <Link href="/configure">Sett opp en intervjuer</Link>
      </Typography>
    );
  }

  return (
    <Box sx={{ height: 'var(--table-height)' }}>
      <AgentsTable agents={state.agents} />
    </Box>
  );
}
