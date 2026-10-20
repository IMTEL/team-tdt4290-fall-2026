import Grid from '@mui/material/Grid';

import type { ReactNode } from 'react';

import type { Agent } from '@/lib/types';
import { AgentCard } from './AgentCard';

/** One column on a phone, three from a tablet, four on a wide screen. */
const CARD_SIZE = { xs: 12, sm: 4, md: 3, lg: 3 } as const;

/** The agents as cards. */
export function AgentCardGrid({ agents, leading }: { agents: Agent[]; leading?: ReactNode }) {
  return (
    <Grid container spacing={2}>
      {leading && <Grid size={CARD_SIZE}>{leading}</Grid>}
      {agents.map((agent) => (
        <Grid key={agent.id} size={CARD_SIZE}>
          <AgentCard agent={agent} />
        </Grid>
      ))}
    </Grid>
  );
}
