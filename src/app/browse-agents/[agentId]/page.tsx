import { notFound } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { mockAgents } from '@/data/mock-agents';
import { agentStatusLabels, formatDate } from '@/lib/format';

interface AgentDetailPageProps {
  params: Promise<{ agentId: string }>;
}

export default async function AgentDetailPage({ params }: AgentDetailPageProps) {
  const { agentId } = await params;
  const agent = mockAgents.find((a) => a.id === agentId);

  if (!agent) {
    notFound();
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
        {agent.name}
      </Typography>
      <Typography variant="body1">Status: {agentStatusLabels[agent.status]}</Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>
        Opprettet: {formatDate(agent.createdAt)}
      </Typography>
      <Typography variant="body1">{agent.description}</Typography>
    </Box>
  );
}
