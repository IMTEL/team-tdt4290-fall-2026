// @vitest-environment node
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  AVATARS,
  avatarLabel,
  avatarSrc,
  cleanAvatar,
  DEFAULT_AVATAR_SRC,
  isAvatarId,
  parseAvatarChoice,
} from './avatars';

const publicFile = (src: string) => join(process.cwd(), 'public', src);

describe('AVATARS', () => {
  it('has an image in public/avatars/ for every avatar, and for the default', () => {
    for (const { id } of AVATARS) {
      expect(existsSync(publicFile(`/avatars/${id}.svg`)), id).toBe(true);
    }
    expect(existsSync(publicFile(DEFAULT_AVATAR_SRC))).toBe(true);
  });

  it('has unique ids and a label for each', () => {
    expect(new Set(AVATARS.map(({ id }) => id)).size).toBe(AVATARS.length);
    expect(AVATARS.every(({ label }) => label.trim().length > 0)).toBe(true);
  });
});

describe('cleanAvatar and isAvatarId', () => {
  it('keeps the id of one of our avatars', () => {
    expect(isAvatarId('robot')).toBe(true);
    expect(cleanAvatar('ugle')).toBe('ugle');
  });

  it('gives null for anything else, so such an agent still opens', () => {
    expect(cleanAvatar('fjernet-avatar')).toBeNull();
    expect(cleanAvatar('../secret')).toBeNull();
    expect(cleanAvatar('')).toBeNull();
    expect(cleanAvatar(7)).toBeNull();
    expect(cleanAvatar(undefined)).toBeNull();
  });
});

describe('avatarSrc and avatarLabel', () => {
  it('points at the avatar’s image', () => {
    expect(avatarSrc('rev')).toBe('/avatars/rev.svg');
    expect(avatarLabel('rev')).toBe('Rev');
  });

  it('falls back to the default image when there is no avatar or it is unknown', () => {
    expect(avatarSrc(null)).toBe(DEFAULT_AVATAR_SRC);
    expect(avatarSrc(undefined)).toBe(DEFAULT_AVATAR_SRC);
    expect(avatarSrc('fjernet-avatar')).toBe(DEFAULT_AVATAR_SRC);
    expect(avatarLabel(null)).toBe('Standard');
  });
});

describe('parseAvatarChoice', () => {
  it('tells apart not sent, the default image and a chosen avatar', () => {
    expect(parseAvatarChoice(undefined)).toBeUndefined();
    expect(parseAvatarChoice(null)).toBeNull();
    expect(parseAvatarChoice('sol')).toBe('sol');
  });

  it('rejects anything that is not one of our avatars', () => {
    expect(parseAvatarChoice('fjernet-avatar')).toBe('invalid');
    expect(parseAvatarChoice('')).toBe('invalid');
    expect(parseAvatarChoice(3)).toBe('invalid');
    expect(parseAvatarChoice({ id: 'sol' })).toBe('invalid');
  });
});
