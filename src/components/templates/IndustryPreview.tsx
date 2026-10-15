import Chip from '@mui/material/Chip';

import { SECTOR_LABELS, type IndustryTemplate, type Sector } from '@/data/industry-templates';
import styles from './IndustryPreview.module.css';

const SECTORS: Sector[] = ['offentlig', 'privat'];

/**
 * The industry templates, grouped by public and private, shown before the counsellor gets to
 * choose one. Only a preview: the cards to choose from come in the next step.
 */
export function IndustryPreview({ templates }: { templates: IndustryTemplate[] }) {
  return (
    <section aria-labelledby="industry-preview-heading" className={styles.preview}>
      <h2 id="industry-preview-heading" className={styles.heading}>
        Bransjer du kan velge i neste steg
      </h2>
      <p className={styles.lead}>
        Etter intervjueren velger du en bransjemal. Den bestemmer stillingen og bransjen, og om
        arbeidsgiveren er offentlig eller privat.
      </p>
      {SECTORS.map((sector) => (
        <div key={sector} className={styles.group}>
          <h3 className={styles.sector}>{SECTOR_LABELS[sector]}</h3>
          <ul className={styles.list} aria-label={`${SECTOR_LABELS[sector]} sektor`}>
            {templates
              .filter((template) => template.sector === sector)
              .map((template) => (
                <li key={template.id}>
                  <Chip
                    variant="outlined"
                    label={`${template.title} · ${template.industry}`}
                    size="small"
                  />
                </li>
              ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
