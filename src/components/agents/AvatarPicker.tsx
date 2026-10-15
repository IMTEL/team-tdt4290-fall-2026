import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';

import { AVATARS, cleanAvatar, DEFAULT_AVATAR_LABEL } from '@/domain/avatars';
import { AgentAvatar } from './AgentAvatar';

const SIZE = 56;

type AvatarPickerProps = {
  /** The id of the chosen avatar, or null for the default image. */
  value: string | null;
  onChange: (avatar: string | null) => void;
  disabled?: boolean;
};

/**
 * Lets the counsellor choose an avatar for the agent from the set we have, or keep the default
 * image. These are real radio buttons, so the arrow keys and screen readers work as for any other
 * choice, and each avatar is named by the text under it.
 */
export function AvatarPicker({ value, onChange, disabled = false }: AvatarPickerProps) {
  const choices = [{ id: '', label: DEFAULT_AVATAR_LABEL }, ...AVATARS];
  // An id we no longer have shows as the default, which is also what the agent itself shows.
  const chosen = cleanAvatar(value) ?? '';

  return (
    <RadioGroup
      row
      aria-label="Avatar"
      value={chosen}
      onChange={(event) => onChange(cleanAvatar(event.target.value))}
      sx={{ gap: 1 }}
    >
      {choices.map(({ id, label }) => (
        <FormControlLabel
          key={id || 'default'}
          value={id}
          label={label}
          labelPlacement="bottom"
          disabled={disabled}
          sx={{ m: 0, minWidth: SIZE + 24 }}
          control={
            <Radio
              icon={<AgentAvatar avatar={id} size={SIZE} sx={unselected} />}
              checkedIcon={<AgentAvatar avatar={id} size={SIZE} sx={selected} />}
              sx={{ p: 0.5 }}
            />
          }
        />
      ))}
    </RadioGroup>
  );
}

// The ring is an outline, so the picture does not move when an avatar is chosen.
const unselected = { outline: '3px solid transparent', outlineOffset: 2 };
const selected = { outline: '3px solid', outlineColor: 'primary.main', outlineOffset: 2 };
