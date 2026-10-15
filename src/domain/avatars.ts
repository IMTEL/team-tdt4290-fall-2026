/**
 * The avatars a counsellor can give an agent. IDUN has no model that makes images, so the
 * counsellor picks one of these. The images are in public/avatars/, and only the id is saved with
 * the agent (see storedAnswers.ts).
 */
export const AVATARS = [
  // English translation of the labels: Robot, Owl, Fox, Cat, Bear, Penguin, Star, Sun
  { id: 'robot', label: 'Robot' },
  { id: 'ugle', label: 'Ugle' },
  { id: 'rev', label: 'Rev' },
  { id: 'katt', label: 'Katt' },
  { id: 'bjorn', label: 'Bjørn' },
  { id: 'pingvin', label: 'Pingvin' },
  { id: 'stjerne', label: 'Stjerne' },
  { id: 'sol', label: 'Sol' },
] as const;

export type AvatarId = (typeof AVATARS)[number]['id'];

/** The image for an agent that has no avatar, or one that is no longer in the list. */
export const DEFAULT_AVATAR_SRC = '/avatars/default.svg';

// English translation: Default avatar
export const DEFAULT_AVATAR_LABEL = 'Standard';

export function isAvatarId(value: unknown): value is AvatarId {
  return AVATARS.some(({ id }) => id === value);
}

/**
 * The avatar id in `value`, or null if there is none. Anything that is not one of ours also gives
 * null, so an agent saved with an avatar we have since removed, or by another client, still opens
 * and shows the default image.
 */
export function cleanAvatar(value: unknown): AvatarId | null {
  return isAvatarId(value) ? value : null;
}

/** The path of the avatar's image, or the default image when there is no avatar. */
export function avatarSrc(avatar: string | null | undefined): string {
  return isAvatarId(avatar) ? `/avatars/${avatar}.svg` : DEFAULT_AVATAR_SRC;
}

/** What the avatar is called for screen readers. */
export function avatarLabel(avatar: string | null | undefined): string {
  return AVATARS.find(({ id }) => id === avatar)?.label ?? DEFAULT_AVATAR_LABEL;
}

/**
 * The avatar the browser asked for. `undefined` means it did not send one, `null` means the
 * default image, and a string must be the id of one of our avatars. Anything else is `'invalid'`.
 */
export function parseAvatarChoice(value: unknown): AvatarId | null | undefined | 'invalid' {
  if (value === undefined || value === null) return value;
  return isAvatarId(value) ? value : 'invalid';
}
