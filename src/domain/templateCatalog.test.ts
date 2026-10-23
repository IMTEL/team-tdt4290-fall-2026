import { describe, expect, it } from 'vitest';

import type { IndustryTemplate } from '@/data/industry-templates';
import type { JobSeekerProfile } from '@/domain/jobSeekerProfile';
import {
  industryCatalog,
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
      },
      {
        id: 'Varehandel',
        title: 'Varehandel',
        line: 'Privat',
        detail: 'Butikkmedarbeider.',
      },
    ]);
  });
});

describe('jobCatalog', () => {
  it('shows the job, the industry and one sentence', () => {
    expect(jobCatalog([helse])[0]).toEqual({
      id: 'helsefagarbeider',
      title: 'Helsefagarbeider',
      line: 'Helse og omsorg · Offentlig',
      detail: 'Pleie og omsorg på sykehjem.',
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
        href: '/profiles/profil%20a/edit',
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
        href: '/templates/saved-1/edit',
      },
    ]);
  });
});
