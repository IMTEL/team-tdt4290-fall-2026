import type { Metadata } from 'next';
import Link from 'next/link';
import Typography from '@mui/material/Typography';

import { TemplateLibrary } from './TemplateLibrary';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Maler',
  description:
    'Bransjemaler, jobbsøkermaler, stillingsmaler og lovverk du kan bruke når du setter opp en agent.',
};

export default function TemplatesPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Typography variant="h4" component="h1">
          Maler
        </Typography>
        <Link href="/create-template?agentType=interviewer" className={styles.newTemplate}>
          Lag ny mal
        </Link>
      </header>
      <TemplateLibrary />
    </div>
  );
}
