import { afterEach, describe, expect, it } from 'vitest';

import { EMPTY_INTERVIEW_SETTINGS } from './SettingsStep';
import {
  clearWizardDraft,
  readWizardDraft,
  writeWizardDraft,
  type WizardDraft,
} from './wizardDraft';

const draft: WizardDraft = {
  version: 2,
  agentTypeId: 'interviewer',
  wizardStep: 2,
  furthestStep: 2,
  workplace: {
    jobTitle: 'Barnehageassistent',
    templateId: 'barnehageassistent',
    industry: 'Oppvekst og utdanning',
    sector: 'offentlig',
    company: '',
  },
  hasTemplateChoice: true,
  template: {
    id: 'teamleder',
    agentType: 'interviewer',
    title: 'Teamleder',
    description: 'Leder',
    focus: ['Ledelse'],
    persona: 'Du er en teamleder.',
  },
  profileId: 'profile-1',
  practiceAreas: ['Mestre nervøsitet'],
  otherOpen: false,
  otherPractice: '',
  settings: EMPTY_INTERVIEW_SETTINGS,
  avatar: null,
  nameEdited: false,
  agentName: '',
  presetsDone: false,
};

afterEach(() => {
  localStorage.clear();
});

describe('wizardDraft', () => {
  it('round-trips a draft through localStorage', () => {
    writeWizardDraft(draft);
    expect(readWizardDraft()).toEqual(draft);
  });

  it('returns null when nothing is stored', () => {
    expect(readWizardDraft()).toBeNull();
  });

  it('returns null for a broken or foreign value', () => {
    localStorage.setItem('kfi-configure-draft', '{');
    expect(readWizardDraft()).toBeNull();
    localStorage.setItem('kfi-configure-draft', JSON.stringify({ version: 99 }));
    expect(readWizardDraft()).toBeNull();
  });

  it('moves Fullføre from step 4 to 5 in drafts from before AI-innstillinger', () => {
    localStorage.setItem(
      'kfi-configure-draft',
      JSON.stringify({ ...draft, version: 1, wizardStep: 4, furthestStep: 4 }),
    );
    expect(readWizardDraft()).toMatchObject({ version: 2, wizardStep: 5, furthestStep: 5 });
  });

  it('clears the draft', () => {
    writeWizardDraft(draft);
    clearWizardDraft();
    expect(readWizardDraft()).toBeNull();
  });
});
