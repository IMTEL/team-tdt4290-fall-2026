import { describe, expect, it } from 'vitest';

import { findIndustryTemplate } from '@/data/industry-templates';
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
  return { workplace, interviewer: null, profile: null, settings, ...overrides };
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
    const saved = wizardConfiguration(draft({ interviewer, profile }));
    const job = findIndustryTemplate('helsefagarbeider');

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
