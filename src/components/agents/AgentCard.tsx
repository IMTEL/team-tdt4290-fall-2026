import Link from 'next/link';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';

import { agentRole, agentSummary } from '@/domain/agentList';
import type { Agent } from '@/lib/types';
import { AgentAvatar } from './AgentAvatar';
import styles from './AgentCard.module.css';

/**
 * One agent in the agent list. The card links to the agent's page. The test button sits outside
 * that link, because a link inside a link is invalid HTML and confuses screen readers.
 */
export function AgentCard({ agent }: { agent: Agent }) {
  const id = encodeURIComponent(agent.id);
  const role = agentRole(agent);
  const summary = agentSummary(agent);

  return (
    <Card variant="outlined" className={styles.card}>
      <CardActionArea component={Link} href={`/browse-agents/${id}`} className={styles.action}>
        <CardContent className={styles.content}>
          <AgentAvatar avatar={agent.avatar} size={56} className={styles.avatar} />
          <Typography variant="h6" component="h3">
            {agent.name}
          </Typography>
          {role && <Typography color="text.secondary">{role}</Typography>}
          {summary && (
            <Typography variant="body2" className={styles.summary}>
              {summary}
            </Typography>
          )}
        </CardContent>
      </CardActionArea>
      <CardActions>
        <Button component={Link} href={`/test-chat?agent=${id}`} size="small">
          {/* English translation: Test the agent */}
          Test agenten
        </Button>
      </CardActions>
    </Card>
  );
}
