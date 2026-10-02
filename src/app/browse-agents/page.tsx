import type { Metadata } from 'next';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { AgentList } from './AgentList';

export const metadata: Metadata = {
  title: 'Agenter',
  description: 'Oversikt over intervjuagentene du har satt opp.',
};

export default function BrowseAgentsPage() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
        Agenter
      </Typography>
      <AgentList />
    </Box>
  );
}
