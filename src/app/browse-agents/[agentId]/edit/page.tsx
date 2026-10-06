import { EditAgent } from './EditAgent';

interface EditAgentPageProps {
  params: Promise<{ agentId: string }>;
}

export default async function EditAgentPage({ params }: EditAgentPageProps) {
  const { agentId } = await params;
  return <EditAgent agentId={agentId} />;
}
