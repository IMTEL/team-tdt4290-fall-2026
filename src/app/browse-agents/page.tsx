import type { Metadata } from 'next';
import Typography from '@mui/material/Typography';
import { AgentList } from './AgentList';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Agenter',
  description: 'Oversikt over intervjuagentene du har satt opp.',
};

export default function BrowseAgentsPage() {
  return (
    <div className={styles.page}>
      {/* The margin is on a wrapper: MUI's own styles load after ours and reset its margin. */}
      <header className={styles.header}>
        <Typography variant="h4" component="h1">
          Agenter
        </Typography>
      </header>
      <AgentList />
    </div>
  );
}
