import { describe, expect, it } from 'vitest';

import { profileFromSettings, settingsWithProfile } from './counsellorProfile';

const fallback = { name: 'Kari', email: 'kari@example.no' };

describe('profileFromSettings', () => {
  it('uses the login values when nothing is saved', () => {
    expect(profileFromSettings({}, fallback)).toEqual({
      name: 'Kari',
      email: 'kari@example.no',
      image: null,
    });
  });

  it('reads a saved name, email and picture', () => {
    expect(
      profileFromSettings(
        {
          profile: { name: 'Kari N.', email: 'ny@example.no', image: 'data:image/jpeg;base64,abc' },
        },
        fallback,
      ),
    ).toEqual({ name: 'Kari N.', email: 'ny@example.no', image: 'data:image/jpeg;base64,abc' });
  });

  it('keeps one of our avatars', () => {
    expect(profileFromSettings({ profile: { image: 'ugle' } }, fallback).image).toBe('ugle');
  });

  it('ignores a picture that is not an image', () => {
    expect(
      profileFromSettings({ profile: { image: 'https://example.no/a.png' } }, fallback).image,
    ).toBe(null);
  });
});

describe('settingsWithProfile', () => {
  it('writes the profile and keeps the other settings', () => {
    expect(
      settingsWithProfile(
        { language: 'nb' },
        { name: 'Kari N.', email: 'ny@example.no', image: null },
      ),
    ).toEqual({
      language: 'nb',
      profile: { name: 'Kari N.', email: 'ny@example.no', image: null },
    });
  });
});
