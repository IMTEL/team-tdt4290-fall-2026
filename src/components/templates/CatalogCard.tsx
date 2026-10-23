import Link from 'next/link';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';

import type { CatalogItem } from '@/domain/templateCatalog';
import styles from './CatalogCard.module.css';

/** A template or profile on the templates page, in the same shape as an agent card. */
export function CatalogCard({ item }: { item: CatalogItem }) {
  const body = (
    <CardContent className={styles.content}>
      <Typography variant="subtitle1" component="h3" className={styles.title}>
        {item.title}
      </Typography>
      {item.line && <Typography className={styles.line}>{item.line}</Typography>}
      {item.detail && <Typography className={styles.detail}>{item.detail}</Typography>}
    </CardContent>
  );

  return (
    <Card variant="outlined" className={styles.card}>
      {item.href ? (
        <CardActionArea component={Link} href={item.href} className={styles.action}>
          {body}
        </CardActionArea>
      ) : (
        body
      )}
    </Card>
  );
}
