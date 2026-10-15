import Avatar from '@mui/material/Avatar';
import type { SxProps, Theme } from '@mui/material/styles';

import { avatarSrc } from '@/domain/avatars';

type AgentAvatarProps = {
  /** The id of the agent's avatar. Null, or an id we no longer have, shows the default image. */
  avatar: string | null | undefined;
  /** Width and height in pixels. */
  size?: number;
  className?: string;
  sx?: SxProps<Theme>;
};

/**
 * An agent's avatar. The agent's name is always next to it, so the image is decorative and has no
 * alt text: a screen reader would only repeat "Ugle" or "Robot" for every agent.
 */
export function AgentAvatar({ avatar, size = 40, className, sx }: AgentAvatarProps) {
  return (
    <Avatar
      src={avatarSrc(avatar)}
      alt=""
      className={className}
      sx={[{ width: size, height: size }, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
    />
  );
}
