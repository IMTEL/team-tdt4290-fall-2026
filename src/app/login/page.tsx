import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import { LoginButtons } from '@/components/login/LoginButtons';
import { authOptions } from '@/lib/auth-options';
import styles from './page.module.css';

// Keycloak has its own login form (e-mail, password, "forgot password"), so this page only
// hands the user over to it. NextAuth sends failed logins back here as `?error=...`, and the
// route protection in src/proxy.ts sends users here with `?callbackUrl=<the page they wanted>`.
export default async function LogInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const { error, callbackUrl } = await searchParams;
  if (await getServerSession(authOptions)) redirect('/');

  return (
    <div className={styles.page}>
      <Card className={styles.mainCard}>
        <CardContent className={styles.cardContent}>
          <div className={styles.header}>
            <Typography variant="h5" component="h1" className={styles.title}>
              Logg inn
            </Typography>
            <Typography variant="body2" className={styles.subtitle}>
              Logg inn for å sette opp intervjuagentene dine.
            </Typography>
          </div>

          {error && <Alert severity="error">Innloggingen mislyktes. Prøv igjen.</Alert>}

          <div className={styles.actions}>
            <LoginButtons callbackUrl={callbackUrl} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
