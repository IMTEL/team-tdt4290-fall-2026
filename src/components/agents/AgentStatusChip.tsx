import Chip from '@mui/material/Chip';

import { AGENT_STATUS_LABEL, type AgentStatus } from '@/domain/agentStatus';

const APPEARANCE: Record<
  AgentStatus,
  { variant: 'outlined' | 'filled'; color: 'default' | 'secondary' | 'primary' }
> = {
  draft: { variant: 'outlined', color: 'default' },
  private: { variant: 'filled', color: 'secondary' },
  published: { variant: 'filled', color: 'primary' },
};

/** The utkast / privat / publisert pill on an agent card. */
export function AgentStatusChip({ status }: { status: AgentStatus }) {
  const appearance = APPEARANCE[status];
  return (
    <Chip
      label={AGENT_STATUS_LABEL[status]}
      size="small"
      variant={appearance.variant}
      color={appearance.color}
    />
  );
}
