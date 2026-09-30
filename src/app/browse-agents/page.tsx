import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { AgentsTable } from '@/components/agents/AgentsTable';
import { mockAgents } from '@/data/mock-agents';

export default function BrowseAgentsPage() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
        Browse Agents
      </Typography>
      <Box sx={{ height: 'var(--table-height)' }}>
        <AgentsTable agents={mockAgents} />
      </Box>
    </Box>
  );
}
