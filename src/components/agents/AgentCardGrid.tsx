import Grid from '@mui/material/Grid';

import type { Agent } from '@/lib/types';
import { AgentCard } from './AgentCard';

/** The agents as cards: one column on phones, up to four on wide screens. */
export function AgentCardGrid({ agents }: { agents: Agent[] }) {
  return (
    <Grid container spacing={2}>
      {agents.map((agent) => (
        <Grid key={agent.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <AgentCard agent={agent} />
        </Grid>
      ))}
    </Grid>
  );
}
