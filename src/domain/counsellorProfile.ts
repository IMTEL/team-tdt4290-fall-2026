import { avatarSrc, isAvatarId } from './avatars';

/** The counsellor's own name, email and picture, stored in the app's user settings. */
export type CounsellorProfile = {
  name: string;
  email: string;
  /** An avatar id, a data URL, or null when the initial is shown. */
  image: string | null;
};

const PROFILE_KEY = 'profile';

/**
 * The saved profile, or the login values when nothing is saved yet. A picture is only kept when
 * it is one of our avatars or an image data URL, so a bad value never becomes a broken image.
 */
export function profileFromSettings(
  settings: unknown,
  fallback: { name: string; email: string },
): CounsellorProfile {
  const saved = isRecord(settings) ? settings[PROFILE_KEY] : undefined;
  const profile = isRecord(saved) ? saved : {};
  const name = text(profile.name) || fallback.name;
  const email = text(profile.email) || fallback.email;
  const image = text(profile.image);
  return {
    name,
    email,
    image: isAvatarId(image) || image.startsWith('data:image/') ? image : null,
  };
}

/** Settings with the profile written in, leaving every other setting as it was. */
export function settingsWithProfile(
  settings: unknown,
  profile: CounsellorProfile,
): Record<string, unknown> {
  const base = isRecord(settings) ? { ...settings } : {};
  return {
    ...base,
    [PROFILE_KEY]: {
      name: profile.name.trim(),
      email: profile.email.trim(),
      image: profile.image,
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** The address of the picture, or null when the initial should be shown. */
export function profileImageUrl(image: string | null): string | null {
  if (!image) return null;
  if (isAvatarId(image)) return avatarSrc(image);
  return image.startsWith('data:image/') ? image : null;
}
