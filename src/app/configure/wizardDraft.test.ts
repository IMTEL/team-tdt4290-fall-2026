import { afterEach, describe, expect, it } from 'vitest';

import { EMPTY_INTERVIEW_SETTINGS } from './SettingsStep';
import {
  clearWizardDraft,
  readWizardDraft,
  writeWizardDraft,
  type WizardDraft,
} from './wizardDraft';

const draft: WizardDraft = {
  version: 1,
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

  it('keeps a draft saved before the max tokens setting, with the default filled in', () => {
    const oldSettings: Record<string, unknown> = { ...EMPTY_INTERVIEW_SETTINGS };
    delete oldSettings.maxTokens;
    localStorage.setItem(
      'kfi-configure-draft',
      JSON.stringify({ ...draft, settings: { ...oldSettings, temperature: 0.4 } }),
    );

    expect(readWizardDraft()?.settings).toEqual({
      ...EMPTY_INTERVIEW_SETTINGS,
      temperature: 0.4,
      maxTokens: 1000,
    });
  });

  it('keeps a draft saved while a number field was empty, with the defaults filled in', () => {
    // An emptied field is NaN, and JSON.stringify writes NaN as null.
    writeWizardDraft({
      ...draft,
      settings: { ...EMPTY_INTERVIEW_SETTINGS, temperature: Number.NaN, maxTokens: Number.NaN },
    });

    expect(readWizardDraft()?.settings).toEqual(EMPTY_INTERVIEW_SETTINGS);
  });

  it('clears the draft', () => {
    writeWizardDraft(draft);
    clearWizardDraft();
    expect(readWizardDraft()).toBeNull();
  });
});
