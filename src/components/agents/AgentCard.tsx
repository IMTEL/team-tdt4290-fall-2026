import Link from 'next/link';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';

import { agentCardDetail, agentInterviewer } from '@/domain/agentList';
import { agentStatus } from '@/domain/agentStatus';
import type { Agent } from '@/lib/types';
import { AgentAvatar } from './AgentAvatar';
import { AgentStatusChip } from './AgentStatusChip';
import styles from './AgentCard.module.css';

/**
 * One agent in the agent list. The card links to the agent's page. The test button sits outside
 * that link, because a link inside a link is invalid HTML and confuses screen readers.
 */
export function AgentCard({ agent }: { agent: Agent }) {
  const id = encodeURIComponent(agent.id);
  const interviewer = agentInterviewer(agent);
  const detail = agentCardDetail(agent);

  return (
    <Card variant="outlined" className={styles.card}>
      <CardActionArea component={Link} href={`/browse-agents/${id}`} className={styles.action}>
        <CardContent className={styles.content}>
          <AgentAvatar avatar={agent.avatar} size={44} className={styles.avatar} />
          <div className={styles.titleRow}>
            <Typography variant="subtitle1" component="h3" className={styles.title}>
              {agent.name}
            </Typography>
            <span className={styles.status}>
              <AgentStatusChip status={agentStatus(agent)} />
            </span>
          </div>
          {interviewer && <Typography className={styles.interviewer}>{interviewer}</Typography>}
          {detail && <Typography className={styles.detail}>{detail}</Typography>}
        </CardContent>
      </CardActionArea>
      <CardActions className={styles.actions}>
        <Button component={Link} href={`/test-chat?agent=${id}`} size="small">
          {/* English translation: Test the agent */}
          Test agenten
        </Button>
      </CardActions>
    </Card>
  );
}
