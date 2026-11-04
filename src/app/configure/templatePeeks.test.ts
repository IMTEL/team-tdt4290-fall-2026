import { describe, expect, it } from 'vitest';

import { industryTemplates } from '@/data/industry-templates';
import { interviewerTemplates } from '@/data/interviewer-templates';
import { builtInLegalParagraphs, builtInLegalTemplates } from '@/data/legal-templates';
import type { JobSeekerProfile } from '@/domain/jobSeekerProfile';
import { peekForStep, peeksOnStep, wizardTemplatePeeks } from './templatePeeks';

const workplace = {
  jobTitle: 'Butikkmedarbeider',
  templateId: 'butikkmedarbeider',
  industry: 'Varehandel',
  sector: 'privat',
  company: '',
};

const profile: JobSeekerProfile = {
  id: 'profile-1',
  label: 'Ny og usikker',
  ageRange: '18-24',
  experienceLevel: 'little',
  workExperience: 'Butikk i somrene',
  education: 'Videregående',
  languages: ['Norsk'],
  practiceAreas: ['Mestre nervøsitet'],
  notes: 'Skjult i oppsummeringen',
};

describe('wizardTemplatePeeks', () => {
  it('summarises the chosen stillingsmal, including what the interviewer is told', () => {
    const peeks = wizardTemplatePeeks({
      workplace,
      jobTemplates: industryTemplates,
      industryTemplates: [],
      interviewer: null,
      profile: null,
      legalTemplates: [],
    });
    const peek = peeks.find((item) => item.kind === 'Stillingsmal');
    if (!peek) throw new Error('missing stillingsmal peek');

    expect(peek).toMatchObject({
      kind: 'Stillingsmal',
      title: 'Butikkmedarbeider',
      summary: 'Kundeservice, kasse og varepåfylling i en dagligvare- eller klesbutikk.',
    });
    expect(peek.details.map((line) => line.label)).toEqual([
      'Om stillingen',
      'Typiske oppgaver',
      'Dette får intervjueren vite',
    ]);
    expect(peek.details[2]?.value).toContain('Hjelper kunder, sitter i kassen');
  });

  it('adds a bransjemal when the chosen industry has its own template', () => {
    const peeks = wizardTemplatePeeks({
      workplace,
      jobTemplates: industryTemplates,
      industryTemplates: [
        {
          id: 'ind-1',
          name: 'Varehandel',
          description: 'Butikk og handel.',
          context: 'Kunder, kasse og varepåfylling.',
        },
      ],
      interviewer: null,
      profile: null,
      legalTemplates: [],
    });

    expect(peeks.map((peek) => peek.kind)).toEqual(['Stillingsmal', 'Bransje']);
    expect(peeks[1]).toMatchObject({
      title: 'Varehandel',
      summary: 'Butikk og handel.',
    });
    expect(peeks[1]?.details).toEqual([
      { label: 'Om bransjen', value: 'Butikk og handel.' },
      { label: 'Dette får intervjueren vite', value: 'Kunder, kasse og varepåfylling.' },
    ]);
  });

  it('summarises an interviewer template with role and style', () => {
    const team = interviewerTemplates.find((item) => item.id === 'teamleder');
    if (!team) throw new Error('missing teamleder template');

    const peeks = wizardTemplatePeeks({
      workplace: { ...workplace, templateId: 'ingen', industry: 'ingen' },
      jobTemplates: industryTemplates,
      industryTemplates: [],
      interviewer: team,
      profile: null,
      legalTemplates: [],
    });

    expect(peeks).toHaveLength(1);
    expect(peeks[0]).toMatchObject({
      kind: 'Intervjuermal',
      title: 'Teamleder',
      summary: 'Skal jobbe tett med kandidaten til daglig. Praktisk og uformell.',
    });
    expect(peeks[0]?.details.some((line) => line.value.includes('nærmeste leder'))).toBe(true);
  });

  it('summarises a job seeker profile without the notes field', () => {
    const [peek] = wizardTemplatePeeks({
      workplace: { ...workplace, templateId: 'ingen', industry: 'ingen' },
      jobTemplates: industryTemplates,
      industryTemplates: [],
      interviewer: null,
      profile,
      legalTemplates: [],
    });

    expect(peek).toMatchObject({
      kind: 'Jobbsøkermal',
      title: 'Ny og usikker',
      summary: '18–24 år · Litt (under 1 år)',
    });
    expect(peek.details.map((line) => line.label)).toEqual([
      'Alder',
      'Erfaring',
      'Utdanning',
      'Språk',
      'Øve på',
    ]);
    expect(peek.details.some((line) => line.value.includes('Skjult'))).toBe(false);
  });

  it('gives the chosen legal template one bubble, and lists the paragraphs inside it', () => {
    const peeks = wizardTemplatePeeks({
      workplace: { ...workplace, templateId: 'ingen', industry: 'ingen' },
      jobTemplates: industryTemplates,
      industryTemplates: [],
      interviewer: null,
      profile: null,
      legalTemplates: builtInLegalTemplates,
    });

    expect(peeks).toHaveLength(1);
    expect(peeks[0]).toMatchObject({
      kind: 'Lovverk',
      title: 'Rettigheter i ansettelsesprosessen',
      summary: 'Hva en arbeidsgiver ikke kan spørre om i et jobbintervju, etter norsk rett.',
    });
    const first = peeks[0];
    if (!first) throw new Error('missing legal peek');
    expect(first.details.map((line) => line.label)).toEqual([
      'Om',
      ...builtInLegalParagraphs.map((paragraph) => paragraph.title),
    ]);
    expect(first.details.some((line) => line.value.includes('graviditet'))).toBe(true);
    expect(first.details).toContainEqual({
      label: builtInLegalParagraphs[0]?.title,
      value: builtInLegalParagraphs[0]?.text,
      href: builtInLegalParagraphs[0]?.sourceUrl,
    });
  });
});

describe('peeksOnStep', () => {
  it('keeps stilling and bransje on the first page, and leaves them off the next', () => {
    const team = interviewerTemplates.find((item) => item.id === 'teamleder');
    if (!team) throw new Error('missing teamleder template');
    const peeks = wizardTemplatePeeks({
      workplace,
      jobTemplates: industryTemplates,
      industryTemplates: [],
      interviewer: team,
      profile,
      legalTemplates: builtInLegalTemplates,
    });

    expect(peeksOnStep(peeks, 0).map((peek) => peek.kind)).toEqual(['Stillingsmal', 'Bransje']);
    expect(peeksOnStep(peeks, 1).map((peek) => peek.kind)).toEqual(['Intervjuermal', 'Lovverk']);
    expect(peeksOnStep(peeks, 2).map((peek) => peek.kind)).toEqual(['Jobbsøkermal']);
    expect(peeksOnStep(peeks, 3)).toEqual([]);
    expect(peekForStep(peeks, 0)?.kind).toBe('Stillingsmal');
    expect(peekForStep(peeks, 1)?.kind).toBe('Intervjuermal');
  });

  it('adds a bransje bubble from the chosen industry name when there is no bransjemal', () => {
    const peeks = wizardTemplatePeeks({
      workplace,
      jobTemplates: industryTemplates,
      industryTemplates: [],
      interviewer: null,
      profile: null,
      legalTemplates: [],
    });
    const bransje = peeks.find((peek) => peek.kind === 'Bransje');
    expect(bransje).toMatchObject({
      title: 'Varehandel',
      summary: 'Intervjueren stiller spørsmål som passer i denne bransjen.',
    });
    expect(bransje?.details).toEqual([
      { label: 'Bransje', value: 'Varehandel' },
      { label: 'Stillinger i bransjen', value: 'Butikkmedarbeider' },
    ]);
  });
});
