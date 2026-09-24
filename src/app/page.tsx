// import { Button } from '@/components/ui/Button';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import styles from './page.module.css';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';

export default function Home() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Interviewer Agent Configurator</h1>
      <p className={styles.lead}>
        Configure AI interviewer agents, try them out in a chat, and publish them to the VR app The
        Candidate.
      </p>

      <Card className={styles.card}>
        <CardContent>
          <h2 className={styles.cardTitle}>Design tokens</h2>
          <p className={styles.cardText}>
            These buttons read their colours from the theme, so they follow light and dark mode
            automatically.
          </p>
          <CardActions className={styles.cardActions}>
            <Button>Default</Button>
            <Button variant="outlined">Outlined</Button>
            <Button variant="contained">Contained</Button>
          </CardActions>
        </CardContent>
      </Card>
    </div>
  );
}
