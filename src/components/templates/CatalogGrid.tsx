import Grid from '@mui/material/Grid';

import type { ReactNode } from 'react';

import type { CatalogItem } from '@/domain/templateCatalog';
import { CatalogCard } from './CatalogCard';

/** One column on a phone, three from a tablet, four on a wide screen. */
const CARD_SIZE = { xs: 12, sm: 4, md: 3, lg: 3 } as const;

/** Template and profile cards, with an optional first card such as «Ny jobbsøkermal». */
export function CatalogGrid({ items, leading }: { items: CatalogItem[]; leading?: ReactNode }) {
  return (
    <Grid container spacing={2}>
      {leading && <Grid size={CARD_SIZE}>{leading}</Grid>}
      {items.map((item) => (
        <Grid key={item.id} size={CARD_SIZE}>
          <CatalogCard item={item} />
        </Grid>
      ))}
    </Grid>
  );
}
