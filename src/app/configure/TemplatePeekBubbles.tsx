'use client';

import { useId, useState, type MouseEvent } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Popover from '@mui/material/Popover';

import type { TemplatePeek } from './templatePeeks';
import styles from './StillingStep.module.css';

/** A short bubble for one template. Click it to read the full contents. */
function PeekBubble({ peek }: { peek: TemplatePeek }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const headingId = useId();
  const open = Boolean(anchor);

  function openPeek(event: MouseEvent<HTMLElement>) {
    setAnchor(event.currentTarget);
  }

  return (
    <>
      <button
        type="button"
        className={styles.peek}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`${peek.kind}: ${peek.title}. Se hele.`}
        onClick={openPeek}
      >
        <span className={styles.peekKind}>{peek.kind}</span>
        <strong className={styles.peekTitle}>{peek.title}</strong>
        <span className={styles.peekSummary}>{peek.summary}</span>
        <span className={styles.peekMore} aria-hidden="true">
          Se hele
        </span>
      </button>
      <PeekPopover
        peek={peek}
        headingId={headingId}
        anchor={anchor}
        onClose={() => setAnchor(null)}
      />
    </>
  );
}

function PeekPopover({
  peek,
  headingId,
  anchor,
  onClose,
}: {
  peek: TemplatePeek;
  headingId: string;
  anchor: HTMLElement | null;
  onClose: () => void;
}) {
  return (
    <Popover
      open={Boolean(anchor)}
      anchorEl={anchor}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      slotProps={{
        paper: {
          className: styles.peekPaper,
          role: 'dialog',
          'aria-labelledby': headingId,
          sx: { width: '22rem', maxWidth: 'calc(100vw - 2rem)' },
        },
      }}
    >
      <div className={styles.peekHeader}>
        <p id={headingId} className={styles.peekHeading}>
          {peek.kind}: {peek.title}
        </p>
        <span className={styles.peekClose}>
          <IconButton type="button" size="small" aria-label="Lukk" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </span>
      </div>
      <dl className={styles.peekDetails}>
        {peek.details.map((line, index) => (
          <div key={`${line.label}-${index}`} className={styles.peekDetail}>
            <dt>{line.label}</dt>
            <dd>
              {line.href ? (
                line.value === 'Se kilden' ? (
                  <a href={line.href} target="_blank" rel="noreferrer">
                    Se kilden
                  </a>
                ) : (
                  <>
                    {line.value}{' '}
                    <a href={line.href} target="_blank" rel="noreferrer">
                      Kilde
                    </a>
                  </>
                )
              ) : (
                line.value
              )}
            </dd>
          </div>
        ))}
      </dl>
    </Popover>
  );
}

/** Chosen templates under the progress bar: a short summary, click for the rest. */
export function TemplatePeekList({ peeks }: { peeks: TemplatePeek[] }) {
  if (peeks.length === 0) return null;
  return (
    <div className={styles.peekList} role="region" aria-label="Valgte maler">
      {peeks.map((peek) => (
        <PeekBubble key={peek.id} peek={peek} />
      ))}
    </div>
  );
}

/** Opens the current step's template, placed before Tilbake. */
export function SeeWholeTemplate({ peek }: { peek: TemplatePeek }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const headingId = useId();

  return (
    <>
      <Button
        type="button"
        className={styles.seeWhole}
        aria-expanded={Boolean(anchor)}
        aria-haspopup="dialog"
        onClick={(event) => setAnchor(event.currentTarget)}
      >
        Se hele
      </Button>
      <PeekPopover
        peek={peek}
        headingId={headingId}
        anchor={anchor}
        onClose={() => setAnchor(null)}
      />
    </>
  );
}
