import Grid from '@mui/material/Grid';

import type { ReactNode } from 'react';

import type { Agent } from '@/lib/types';
import { AgentCard } from './AgentCard';

/** One column on a phone, three from a tablet, four on a wide screen. */
export const AGENT_CARD_SIZE = { xs: 12, sm: 4, md: 3, lg: 3 } as const;

/**
 * The agents as cards. `leading` is raw grid cells (e.g. «Ny agent» and an utkast), so more than
 * one starter card can sit in the first row.
 */
export function AgentCardGrid({ agents, leading }: { agents: Agent[]; leading?: ReactNode }) {
  return (
    <Grid container spacing={2}>
      {leading}
      {agents.map((agent) => (
        <Grid key={agent.id} size={AGENT_CARD_SIZE}>
          <AgentCard agent={agent} />
        </Grid>
      ))}
    </Grid>
  );
}
