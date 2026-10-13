import { describe, expect, it } from 'vitest';

import { fromRagdollProfile, parseNewProfile, toRagdollProfile } from './profileMapper';

const profile = {
  label: 'Profil A',
  ageRange: '18-24',
  experienceLevel: 'little',
  workExperience: 'sommerjobb',
  education: 'videregående',
  languages: ['Norsk B1'],
  practiceAreas: ['Mestre nervøsitet'],
  notes: 'notat',
};

describe('parseNewProfile', () => {
  it('trims the fields, drops empty list items and keeps only the fields we store', () => {
    expect(
      parseNewProfile({
        ...profile,
        label: '  Profil A ',
        languages: [' Norsk B1 ', ''],
        owner_id: 'someone-else',
      }),
    ).toEqual(profile);
  });

  it('fills in what is left out', () => {
    expect(parseNewProfile({ label: 'Profil A' })).toEqual({
      label: 'Profil A',
      ageRange: null,
      experienceLevel: null,
      workExperience: '',
      education: '',
      languages: [],
      practiceAreas: [],
      notes: '',
    });
  });

  it.each([
    ['the body is not an object', null],
    ['the label is empty', { ...profile, label: '  ' }],
    ['the label is too long', { ...profile, label: 'x'.repeat(101) }],
    ['the age range is not one we offer', { ...profile, ageRange: '33' }],
    ['the experience level is not one we offer', { ...profile, experienceLevel: 'lots' }],
    ['a language is too long', { ...profile, languages: ['x'.repeat(51)] }],
    ['there are too many practice areas', { ...profile, practiceAreas: Array(21).fill('x') }],
    ['the notes are too long', { ...profile, notes: 'x'.repeat(2001) }],
  ])('returns null when %s', (_case, body) => {
    expect(parseNewProfile(body)).toBeNull();
  });
});

describe('toRagdollProfile and fromRagdollProfile', () => {
  it('stores the profile with RAGdoll’s field names, and reads it back', () => {
    const parsed = parseNewProfile(profile)!;
    const stored = toRagdollProfile(parsed);

    expect(stored).toEqual({
      label: 'Profil A',
      age_range: '18-24',
      experience_level: 'little',
      education: 'videregående',
      work_experience: 'sommerjobb',
      languages: ['Norsk B1'],
      practice_areas: ['Mestre nervøsitet'],
      notes: 'notat',
    });
    expect(fromRagdollProfile({ ...stored, id: 'profile-1' })).toEqual({
      ...parsed,
      id: 'profile-1',
    });
  });

  it('reads a choice it does not know as not given', () => {
    const stored = { ...toRagdollProfile(parseNewProfile(profile)!), id: 'profile-1' };

    expect(
      fromRagdollProfile({ ...stored, age_range: '33', experience_level: 'lots' }),
    ).toMatchObject({ ageRange: null, experienceLevel: null });
  });
});
