'use client';

import { useState } from 'react';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';

import { groupLegalTemplates, type LegalTemplate } from '@/domain/legalTemplate';
import styles from './LegalTemplateSelect.module.css';

type LegalParagraphPickerProps = {
  /** Built-in paragraphs, grouped by jurisdiction. */
  paragraphs: LegalTemplate[];
  /** The ticked paragraphs' ids, in the order they were ticked. */
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
};

/** Checkboxes for each law and paragraph, with expandable text and a link to the source. */
export function LegalParagraphPicker({
  paragraphs,
  value,
  onChange,
  disabled = false,
}: LegalParagraphPickerProps) {
  const [openIds, setOpenIds] = useState<string[]>([]);
  const groups = groupLegalTemplates(paragraphs);

  function toggle(id: string, checked: boolean) {
    onChange(checked ? [...value, id] : value.filter((item) => item !== id));
  }

  function toggleOpen(id: string) {
    setOpenIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  return (
    <div className={styles.groups}>
      {groups.map((group) => (
        <div key={group.id} className={styles.group} role="group" aria-label={group.label}>
          <p className={styles.groupLabel}>{group.label}</p>
          <div className={styles.options}>
            {group.templates.map((paragraph) => {
              const isPlaceholder = Boolean(paragraph.placeholder);
              const checked = !isPlaceholder && value.includes(paragraph.id);
              const open = openIds.includes(paragraph.id);
              const textId = `${paragraph.id}-text`;
              return (
                <div
                  key={paragraph.id}
                  className={
                    isPlaceholder ? `${styles.option} ${styles.placeholder}` : styles.option
                  }
                >
                  <div className={styles.optionHead}>
                    <FormControlLabel
                      className={styles.choice}
                      label={paragraph.title}
                      control={
                        <Checkbox
                          size="small"
                          checked={checked}
                          disabled={disabled || isPlaceholder}
                          onChange={(event) => toggle(paragraph.id, event.target.checked)}
                        />
                      }
                    />
                    <div className={styles.optionActions}>
                      {isPlaceholder ? (
                        <span className={styles.soon}>Kommer senere</span>
                      ) : (
                        <>
                          <button
                            type="button"
                            className={styles.toggle}
                            aria-expanded={open}
                            aria-controls={open ? textId : undefined}
                            aria-label={open ? 'Skjul lovtekst' : 'Vis lovtekst'}
                            onClick={() => toggleOpen(paragraph.id)}
                          >
                            {open ? 'Skjul' : 'Vis'}
                          </button>
                          {paragraph.sourceUrl && (
                            <a
                              className={styles.source}
                              href={paragraph.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Kilde
                            </a>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  {open && !isPlaceholder && (
                    <p id={textId} className={styles.body}>
                      {paragraph.text}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
