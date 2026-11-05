import { useId, useState } from 'react';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';

import {
  hasActiveFilters,
  type AgentFilterKey,
  type AgentFilterOptions,
  type AgentFilters as Filters,
} from '@/domain/agentFilters';
import styles from './AgentFilters.module.css';

/** The filters in the order they are shown, with their labels. */
const FILTERS: { key: AgentFilterKey; label: string }[] = [
  { key: 'role', label: 'Rolle' },
  { key: 'industry', label: 'Bransje' },
  { key: 'sector', label: 'Sektor' },
  { key: 'interviewType', label: 'Intervjutype' },
  { key: 'difficulty', label: 'Vanskelighetsgrad' },
  { key: 'status', label: 'Status' },
];

type Props = {
  options: AgentFilterOptions;
  value: Filters;
  onChange: (value: Filters) => void;
  onReset: () => void;
};

/**
 * A Filtrer button that opens one dropdown per filter, with «Alle» first, and a button that
 * clears them all. A filter with no choices (no agent has that answer) is turned off.
 */
export function AgentFilters({ options, value, onChange, onReset }: Props) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const active = hasActiveFilters(value);

  return (
    <>
      <Button
        variant={open || active ? 'contained' : 'outlined'}
        className={styles.toggle}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((current) => !current)}
        startIcon={<FilterAltIcon />}
      >
        {/* English translation: Filter */}
        Filtrer
      </Button>
      {open && (
        // English translation: Filter agents
        <div id={panelId} role="group" aria-label="Filtrer agenter" className={styles.filters}>
          {FILTERS.map(({ key, label }) => (
            <TextField
              key={key}
              select
              size="small"
              label={label}
              value={value[key]}
              onChange={(event) => onChange({ ...value, [key]: event.target.value })}
              disabled={options[key].length === 0}
              className={styles.field}
              slotProps={{
                // Shows «Alle» in the field, not an empty box under the label.
                select: { displayEmpty: true },
                inputLabel: { shrink: true },
              }}
            >
              {/* English translation: All */}
              <MenuItem value="">Alle</MenuItem>
              {options[key].map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          ))}
          <Button
            onClick={onReset}
            disabled={!active}
            startIcon={<FilterAltOffIcon />}
            className={styles.reset}
          >
            {/* English translation: Reset filters */}
            Nullstill filtre
          </Button>
        </div>
      )}
    </>
  );
}
