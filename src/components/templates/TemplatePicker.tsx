'use client';

import Link from 'next/link';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardActions from '@mui/material/CardActions';
import Chip from '@mui/material/Chip';

import type { AgentTemplate } from '@/data/templates';
import { withReturnTo } from '@/lib/returnTo';
import { DeleteTemplateButton } from './DeleteTemplateButton';
import styles from './TemplatePicker.module.css';

type TemplatePickerProps = {
  /** The built-in templates. */
  templates: AgentTemplate[];
  /** The counsellor's own templates, shown after the built-in ones and with edit and delete. */
  savedTemplates?: AgentTemplate[];
  /** Called with the chosen template, or null to start without one. */
  onSelect: (template: AgentTemplate | null) => void;
  /** Called with the id of a saved template once it is deleted. */
  onDeleted?: (id: string) => void;
  /** The agent type the templates are for, so a new template gets that type from the start. */
  agentType?: string;
  /** What a template decides for this agent type. */
  lead?: string;
  /** The list only. The surrounding screen draws the heading and the buttons. */
  embedded?: boolean;
  /** Cards stay put when chosen. The screen around them moves on with its own Neste. */
  asRadios?: boolean;
  /** The chosen template's id, when `asRadios` is set. */
  selectedId?: string | null;
  /** Where Rediger and Lag en ny mal send the counsellor back, when they opened this from a wizard. */
  returnTo?: string;
};

// For an agent type without its own lead.
const DEFAULT_LEAD =
  'Malen fyller inn en del av oppsettet. Resten setter du opp i samtalen. Uten mal spør ' +
  'assistenten deg om alt.';

export function TemplatePicker({
  templates,
  savedTemplates = [],
  onSelect,
  onDeleted = () => {},
  agentType,
  lead = DEFAULT_LEAD,
  embedded = false,
  asRadios = false,
  selectedId = null,
  returnTo,
}: TemplatePickerProps) {
  const newTemplateHref = withReturnTo(
    agentType ? `/create-template?agentType=${encodeURIComponent(agentType)}` : '/create-template',
    returnTo,
  );

  function card(template: AgentTemplate, saved: boolean) {
    const selected = asRadios && selectedId === template.id;
    return (
      <li key={template.id}>
        <Card
          variant="outlined"
          className={selected ? `${styles.card} ${styles.chosen}` : styles.card}
        >
          <CardActionArea
            onClick={() => onSelect(template)}
            className={styles.action}
            role={asRadios ? 'radio' : undefined}
            aria-checked={asRadios ? selected : undefined}
          >
            <h3 className={styles.title}>{template.title}</h3>
            <p className={styles.description}>{template.description}</p>
            <div className={styles.focus}>
              {template.focus.map((item) => (
                <Chip key={item} label={item} size="small" />
              ))}
            </div>
          </CardActionArea>
          {/* Outside the action area: a button inside a button is not valid HTML. */}
          {saved && (
            <CardActions className={styles.cardActions}>
              <Button
                component={Link}
                href={withReturnTo(`/templates/${encodeURIComponent(template.id)}/edit`, returnTo)}
                size="small"
                className={styles.edit}
                aria-label={`Rediger ${template.title}`}
              >
                Rediger
              </Button>
              <DeleteTemplateButton template={template} onDeleted={onDeleted} />
            </CardActions>
          )}
        </Card>
      </li>
    );
  }

  const list = (
    <ul className={styles.grid}>
      {templates.map((template) => card(template, false))}
      {savedTemplates.map((template) => card(template, true))}
    </ul>
  );

  return (
    <section aria-labelledby="template-picker-heading" className={styles.picker}>
      {!embedded && (
        <>
          <Button variant="contained" onClick={() => onSelect(null)} className={styles.scratch}>
            Fortsett uten mal
          </Button>

          <Button
            component={Link}
            href={newTemplateHref}
            variant="outlined"
            className={styles.scratch}
          >
            Lag en ny mal
          </Button>
        </>
      )}

      <h2 id="template-picker-heading" className={styles.heading}>
        Velg en mal
      </h2>
      <p className={styles.lead}>{lead}</p>

      {asRadios ? (
        // The group is around the list, so the cards are still a list and also radios.
        <div role="radiogroup" aria-labelledby="template-picker-heading">
          {list}
        </div>
      ) : (
        list
      )}
    </section>
  );
}
