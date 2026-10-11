'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { AgentCardGrid } from '@/components/agents/AgentCardGrid';
import { groupAgentsByType } from '@/domain/agentList';
import type { Agent } from '@/lib/types';
import { fetchAgents } from './api';

type ListState = { kind: 'loading' } | { kind: 'ready'; agents: Agent[] } | { kind: 'error' };

/**
 * The counsellor's agents as cards, in one section per agent type. An empty list and a failed
 * request are different states.
 */
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

  return groupAgentsByType(state.agents).map((section) => (
    <Box component="section" key={section.key} sx={{ mb: 4 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        {section.title}
      </Typography>
      <AgentCardGrid agents={section.agents} />
    </Box>
  ));
}
