import Link from 'next/link';
import AddIcon from '@mui/icons-material/Add';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Typography from '@mui/material/Typography';

import styles from './AddCatalogCard.module.css';

/**
 * A dashed first card, the same shape as «Ny agent». With a link it goes somewhere the counsellor
 * can add one more. Without a link it is only a placeholder.
 */
export function AddCatalogCard({
  href,
  title,
  subtitle,
}: {
  href?: string;
  title: string;
  subtitle: string;
}) {
  const inner = (
    <span className={styles.inner}>
      <span className={styles.plus} aria-hidden="true">
        <AddIcon fontSize="inherit" />
      </span>
      <Typography variant="subtitle1" component="h3" className={styles.title}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {subtitle}
      </Typography>
    </span>
  );

  return (
    <Card variant="outlined" className={styles.card}>
      {href ? (
        <CardActionArea component={Link} href={href} className={styles.action}>
          {inner}
        </CardActionArea>
      ) : (
        <div className={styles.action}>{inner}</div>
      )}
    </Card>
  );
}
