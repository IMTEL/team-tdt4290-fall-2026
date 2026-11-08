import { afterEach, describe, expect, it } from 'vitest';

import { EMPTY_INTERVIEW_SETTINGS } from './SettingsStep';
import {
  clearWizardDraft,
  configureDraftHref,
  readWizardDraft,
  readWizardDrafts,
  writeWizardDraft,
  type WizardDraft,
} from './wizardDraft';

const draft: WizardDraft = {
  version: 2,
  id: 'draft-1',
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
};

afterEach(() => {
  localStorage.clear();
});

describe('wizardDraft', () => {
  it('round-trips a draft through localStorage', () => {
    writeWizardDraft(draft);
    expect(readWizardDraft('draft-1')).toMatchObject(draft);
  });

  it('returns null when nothing is stored', () => {
    expect(readWizardDraft()).toBeNull();
    expect(readWizardDrafts()).toEqual([]);
  });

  it('returns an empty list for a broken or foreign value', () => {
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

  it('moves Fullføre from step 4 to 5 in drafts from before AI-innstillinger', () => {
    localStorage.setItem(
      'kfi-configure-draft',
      JSON.stringify({ ...draft, id: undefined, version: 1, wizardStep: 4, furthestStep: 4 }),
    );
    expect(readWizardDraft()).toMatchObject({
      version: 2,
      id: 'legacy',
      wizardStep: 5,
      furthestStep: 5,
    });
  });

  it('keeps a previous utkast when a new one is written', () => {
    writeWizardDraft(draft);
    writeWizardDraft({
      ...draft,
      id: 'draft-2',
      workplace: { ...draft.workplace, jobTitle: 'Butikkmedarbeider' },
    });

    const drafts = readWizardDrafts();
    expect(drafts.map((item) => item.workplace.jobTitle)).toEqual([
      'Butikkmedarbeider',
      'Barnehageassistent',
    ]);
    expect(readWizardDraft('draft-1')?.workplace.jobTitle).toBe('Barnehageassistent');
  });

  it('clears one draft and leaves the others', () => {
    writeWizardDraft(draft);
    writeWizardDraft({ ...draft, id: 'draft-2' });
    clearWizardDraft('draft-1');
    expect(readWizardDrafts().map((item) => item.id)).toEqual(['draft-2']);
  });

  it('clears every draft when no id is given', () => {
    writeWizardDraft(draft);
    clearWizardDraft();
    expect(readWizardDraft()).toBeNull();
  });

  it('builds a configure link for one utkast', () => {
    expect(configureDraftHref('draft-1', 'jobbsøker')).toBe(
      '/configure?type=interviewer&draft=draft-1&step=jobbsøker',
    );
  });
});
