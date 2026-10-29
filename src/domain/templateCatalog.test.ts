import { describe, expect, it } from 'vitest';

import type { IndustryTemplate } from '@/data/industry-templates';
import type { JobSeekerProfile } from '@/domain/jobSeekerProfile';
import {
  findIndustry,
  industryCatalog,
  industrySlug,
  jobCatalog,
  profileCatalog,
  savedTemplateCatalog,
} from './templateCatalog';

const helse: IndustryTemplate = {
  id: 'helsefagarbeider',
  title: 'Helsefagarbeider',
  industry: 'Helse og omsorg',
  sector: 'offentlig',
  description: 'Pleie og omsorg på sykehjem.',
  tasks: ['Pleie'],
  jobDescription: 'Hjelper beboere.',
};

const butikk: IndustryTemplate = {
  id: 'butikkmedarbeider',
  title: 'Butikkmedarbeider',
  industry: 'Varehandel',
  sector: 'privat',
  description: 'Kundeservice og kasse.',
  tasks: ['Kasse'],
  jobDescription: 'Hjelper kunder.',
};

const profile: JobSeekerProfile = {
  id: 'profil a',
  label: 'Profil A',
  ageRange: '18-24',
  experienceLevel: 'little',
  workExperience: '',
  education: '',
  languages: [],
  practiceAreas: ['Mestre nervøsitet'],
  notes: 'Bare for veilederen',
};

describe('industryCatalog', () => {
  it('groups jobs under their industry and names the sector', () => {
    expect(industryCatalog([helse, butikk])).toEqual([
      {
        id: 'Helse og omsorg',
        title: 'Helse og omsorg',
        line: 'Offentlig',
        detail: 'Helsefagarbeider.',
        href: '/templates/industries/helse-og-omsorg',
      },
      {
        id: 'Varehandel',
        title: 'Varehandel',
        line: 'Privat',
        detail: 'Butikkmedarbeider.',
        href: '/templates/industries/varehandel',
      },
    ]);
  });
});

describe('industrySlug and findIndustry', () => {
  it('makes a readable address part, keeping æ, ø and å', () => {
    expect(industrySlug('Helse og omsorg')).toBe('helse-og-omsorg');
    expect(industrySlug(' Bygg & anlegg ')).toBe('bygg-anlegg');
    expect(industrySlug('Fiske og sjømat')).toBe('fiske-og-sjømat');
  });

  it('finds the industry and its jobs from the slug, or nothing', () => {
    expect(findIndustry([helse, butikk], 'varehandel')).toEqual({
      industry: 'Varehandel',
      jobs: [butikk],
    });
    expect(findIndustry([helse, butikk], 'finnes-ikke')).toBeUndefined();
  });
});

describe('the counsellor’s own jobs', () => {
  const ownJob: IndustryTemplate = { ...butikk, id: 'job-1', title: 'Kassemedarbeider' };

  it('puts them in a built-in industry, which stays built in', () => {
    const [varehandel] = industryCatalog([butikk, ownJob]);
    expect(varehandel.detail).toBe('Butikkmedarbeider, Kassemedarbeider.');
    expect(varehandel.chip).toBeUndefined();
    expect(findIndustry([butikk, ownJob], 'varehandel')?.jobs).toEqual([butikk, ownJob]);
  });

  it('marks an industry only they are in, and the jobs themselves', () => {
    const logistikk = { ...ownJob, industry: 'Logistikk' };
    expect(industryCatalog([logistikk])[0]).toMatchObject({
      title: 'Logistikk',
      href: '/templates/industries/logistikk',
      chip: 'Egen mal',
    });
    expect(jobCatalog([ownJob])[0].chip).toBe('Egen mal');
    expect(jobCatalog([helse])[0].chip).toBeUndefined();
  });
});

describe('jobCatalog', () => {
  it('shows the job, the industry and one sentence', () => {
    expect(jobCatalog([helse])[0]).toEqual({
      id: 'helsefagarbeider',
      title: 'Helsefagarbeider',
      line: 'Helse og omsorg · Offentlig',
      detail: 'Pleie og omsorg på sykehjem.',
      href: '/templates/jobs/helsefagarbeider',
    });
  });
});

describe('profileCatalog', () => {
  it('links to the profile and leaves the counsellor notes off the card', () => {
    expect(profileCatalog([profile])).toEqual([
      {
        id: 'profil a',
        title: 'Profil A',
        line: '18–24 år · Litt (under 1 år)',
        detail: 'Mestre nervøsitet.',
        href: '/profiles/profil%20a',
      },
    ]);
  });
});

describe('savedTemplateCatalog', () => {
  it('links to edit and shows focus on the card', () => {
    expect(
      savedTemplateCatalog([
        {
          id: 'saved-1',
          agentType: 'interviewer',
          title: 'Min mal',
          description: 'Kort',
          focus: ['Service', 'Samarbeid'],
          persona: 'Hen er butikksjef.',
        },
      ]),
    ).toEqual([
      {
        id: 'saved-1',
        title: 'Min mal',
        line: 'Service · Samarbeid',
        detail: 'Kort.',
        href: '/templates/saved-1',
      },
    ]);
  });
});
