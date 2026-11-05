'use client';

import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';

import styles from './FieldHelp.module.css';

type FieldHelpProps = {
  /** The field's name, used in the button's accessible name. */
  label: string;
  /** What the field means, shown when the question mark is opened. */
  description: string;
};

/**
 * A question mark beside a field. Hover, focus or tap it to read what the field is for.
 */
export function FieldHelp({ label, description }: FieldHelpProps) {
  return (
    <Tooltip
      title={description}
      describeChild
      placement="top"
      enterTouchDelay={0}
      leaveTouchDelay={4000}
      slotProps={{
        tooltip: { className: styles.tooltip },
        popper: { className: styles.popper },
      }}
    >
      <IconButton size="small" className={styles.button} aria-label={`Hva betyr ${label}?`}>
        <HelpOutlineOutlinedIcon fontSize="inherit" />
      </IconButton>
    </Tooltip>
  );
}
