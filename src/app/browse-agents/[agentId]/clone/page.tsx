import { CloneAgent } from './CloneAgent';

interface CloneAgentPageProps {
  params: Promise<{ agentId: string }>;
}

export default async function CloneAgentPage({ params }: CloneAgentPageProps) {
  const { agentId } = await params;
  return <CloneAgent agentId={agentId} />;
}
