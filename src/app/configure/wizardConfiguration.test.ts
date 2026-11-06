import { describe, expect, it } from 'vitest';

import { findJobTemplate, builtInJobTemplates } from '@/data/job-templates';
import { findBuiltInTemplate } from '@/data/templates';
import type { JobSeekerProfile } from '@/domain/jobSeekerProfile';
import { EMPTY_INTERVIEW_SETTINGS, type InterviewSettings } from './SettingsStep';
import { NO_TEMPLATE, type Workplace } from './StillingStep';
import { suggestedAgentName, wizardConfiguration, type WizardDraft } from './wizardConfiguration';

const workplace: Workplace = {
  jobTitle: 'Barnehageassistent',
  templateId: 'helsefagarbeider',
  industry: 'Helse og omsorg',
  sector: 'offentlig',
  company: '',
};

const settings: InterviewSettings = {
  ...EMPTY_INTERVIEW_SETTINGS,
  interviewType: 'første intervju',
  difficulty: 'lett',
  questionCount: '5–6',
  followUp: 'ja',
};

const profile: JobSeekerProfile = {
  id: 'profile-1',
  label: 'Profil A',
  ageRange: '18-24',
  experienceLevel: 'little',
  workExperience: '',
  education: '',
  languages: [],
  practiceAreas: ['Mestre nervøsitet'],
  notes: 'bare for veilederen',
};

function draft(overrides: Partial<WizardDraft> = {}): WizardDraft {
  return {
    workplace,
    jobTemplates: builtInJobTemplates,
    industryTemplates: [],
    interviewer: null,
    profile: null,
    practiceAreas: [],
    legalTemplates: [],
    settings,
    ...overrides,
  };
}

describe('suggestedAgentName', () => {
  it('uses the job title', () => {
    expect(suggestedAgentName('  Barnehageassistent  ')).toBe('Intervjuer for Barnehageassistent');
  });

  it('has a name even before a job title is written', () => {
    expect(suggestedAgentName('   ')).toBe('Intervjuer');
  });
});

describe('wizardConfiguration', () => {
  it('writes the nine answers, with sentences for what was skipped', () => {
    const interviewer = findBuiltInTemplate('teamleder');
    const saved = wizardConfiguration(
      draft({ interviewer, profile, practiceAreas: ['Mestre nervøsitet'] }),
    );
    const job = findJobTemplate('helsefagarbeider');

    expect(saved?.answers).toEqual({
      stilling: `Barnehageassistent. ${job?.jobDescription}`,
      bransje: 'Helse og omsorg (offentlig)',
      bedrift: 'ikke oppgitt',
      intervjutype: 'første intervju',
      intervjuer: interviewer?.persona,
      jobbsoker:
        'aldersgruppe 18–24 år; arbeidserfaring: litt (under 1 år); vil øve på: mestre nervøsitet',
      vanskelighetsgrad: 'lett | Antall spørsmål: 5–6 | Oppfølgingsspørsmål: ja',
      egneSporsmal: 'ingen',
      tillegg: '',
      lovverk: '',
    });
    expect(saved?.sources).toEqual({
      intervjuer: { kind: 'template', id: 'teamleder' },
      jobbsoker: { kind: 'profile', id: 'profile-1' },
    });
  });

  it('keeps a written company, questions and the number after 10+', () => {
    const saved = wizardConfiguration(
      draft({
        workplace: {
          ...workplace,
          templateId: NO_TEMPLATE,
          industry: NO_TEMPLATE,
          sector: 'ikke-oppgitt',
          company: '  Solsiden  ',
        },
        settings: {
          ...settings,
          questionCount: '10+',
          questionCountDetail: ' 12 ',
          ownQuestions: ' Hvorfor oss? ',
          extra: ' Rolig tempo ',
        },
      }),
    );

    expect(saved?.answers.stilling).toBe('Barnehageassistent');
    expect(saved?.answers.bransje).toBe('Ingen bransje (ikke oppgitt)');
    expect(saved?.answers.bedrift).toBe('Solsiden');
    expect(saved?.answers.intervjuer).toBe('Ingen mal');
    expect(saved?.answers.jobbsoker).toBe('ingen opplysninger om jobbsøkeren');
    expect(saved?.answers.vanskelighetsgrad).toBe(
      'lett | Antall spørsmål: 12 | Oppfølgingsspørsmål: ja',
    );
    expect(saved?.answers.egneSporsmal).toBe('Hvorfor oss?');
    expect(saved?.answers.tillegg).toBe('Rolig tempo');
    expect(saved?.sources).toEqual({});
  });

  it('adds what the bransjemal tells the interviewer to Bransje', () => {
    const logistikk = {
      id: 'industry-1',
      name: 'Logistikk',
      description: 'Lager og transport.',
      context: 'Truckførerbevis er vanlig.',
    };
    const saved = wizardConfiguration(
      draft({
        workplace: { ...workplace, industry: 'logistikk', sector: 'privat' },
        industryTemplates: [logistikk],
      }),
    );
    expect(saved?.answers.bransje).toBe(
      'logistikk (privat) | Om bransjen: Truckførerbevis er vanlig.',
    );

    const withoutText = wizardConfiguration(
      draft({
        workplace: { ...workplace, industry: 'Logistikk', sector: 'privat' },
        industryTemplates: [{ ...logistikk, context: '' }],
      }),
    );
    expect(withoutText?.answers.bransje).toBe('Logistikk (privat)');
  });

  it('uses the chosen practice areas when there is no profile', () => {
    const saved = wizardConfiguration(
      draft({ practiceAreas: ['Mestre nervøsitet', 'Forklare hull i CV-en'] }),
    );

    expect(saved?.answers.jobbsoker).toBe('vil øve på: mestre nervøsitet, forklare hull i cv-en');
  });

  it('keeps areas written after Andre', () => {
    const saved = wizardConfiguration(
      draft({ practiceAreas: ['Mestre nervøsitet', 'turnus', 'lønn og vilkår'] }),
    );

    expect(saved?.answers.jobbsoker).toBe('vil øve på: mestre nervøsitet, turnus, lønn og vilkår');
  });

  it('writes the chosen legal templates into Lovverk with their ids, in the order they were chosen', () => {
    const legal = (id: string, title: string, text: string) => ({
      id,
      title,
      description: '',
      text,
      builtIn: false,
    });
    const saved = wizardConfiguration(
      draft({
        legalTemplates: [
          legal('legal-2', 'Arbeidsmiljøloven § 9-3', 'Ikke spør om helse.'),
          legal('legal-1', 'Likestillingsloven § 30', 'Ikke spør om graviditet.'),
        ],
      }),
    );

    expect(saved?.answers.lovverk).toBe(
      'Arbeidsmiljøloven § 9-3:\nIkke spør om helse.\n\nLikestillingsloven § 30:\nIkke spør om graviditet.',
    );
    expect(saved?.sources).toEqual({ lovverk: { kind: 'legal', ids: ['legal-2', 'legal-1'] } });
  });

  it('refuses to build answers while a required choice is missing', () => {
    expect(wizardConfiguration(draft({ workplace: { ...workplace, jobTitle: '  ' } }))).toBeNull();
    expect(
      wizardConfiguration(
        draft({ settings: { ...settings, questionCount: '10+', questionCountDetail: '' } }),
      ),
    ).toBeNull();
    expect(wizardConfiguration(draft({ settings: { ...settings, followUp: null } }))).toBeNull();
  });
});
