import { describe, expect, it } from 'vitest';

import { describeJobSeeker, summarizeProfile, type JobSeekerProfile } from './jobSeekerProfile';

const profile: JobSeekerProfile = {
  id: 'profile-1',
  label: 'Profil A',
  ageRange: '18-24',
  experienceLevel: 'little',
  workExperience: 'sommerjobb i butikk',
  education: 'videregående',
  languages: ['Norsk B1', 'Arabisk'],
  practiceAreas: ['Mestre nervøsitet', 'Fortelle om seg selv'],
  notes: 'Hemmelig notat for veilederen',
};

describe('describeJobSeeker', () => {
  it('describes every filled-in field on one line', () => {
    expect(describeJobSeeker(profile)).toBe(
      'aldersgruppe 18–24 år; arbeidserfaring: litt (under 1 år), sommerjobb i butikk; ' +
        'utdanning: videregående; språk: Norsk B1, Arabisk; ' +
        'vil øve på: mestre nervøsitet, fortelle om seg selv',
    );
  });

  it('never includes the counsellor’s notes or the profile’s name', () => {
    const line = describeJobSeeker(profile);

    expect(line).not.toContain('Hemmelig');
    expect(line).not.toContain('Profil A');
  });

  it('leaves out empty fields', () => {
    expect(
      describeJobSeeker({
        ...profile,
        ageRange: null,
        experienceLevel: null,
        workExperience: '',
        education: '',
        languages: [],
      }),
    ).toBe('vil øve på: mestre nervøsitet, fortelle om seg selv');
  });

  it('says so when nothing is filled in', () => {
    expect(
      describeJobSeeker({
        ...profile,
        ageRange: null,
        experienceLevel: null,
        workExperience: '',
        education: '',
        languages: [],
        practiceAreas: [],
      }),
    ).toBe('ingen opplysninger om jobbsøkeren');
  });
});

describe('summarizeProfile', () => {
  it('shows the age range and the experience level', () => {
    expect(summarizeProfile(profile)).toBe('18–24 år · Litt (under 1 år)');
    expect(summarizeProfile({ ...profile, ageRange: null, experienceLevel: null })).toBe('');
  });
});
