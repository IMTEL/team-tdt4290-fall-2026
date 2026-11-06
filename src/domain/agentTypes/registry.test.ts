import {
  getAgentType,
  getTemplateAgentType,
  hasAllAnswers,
  listAccessibleAgentTypes,
  listAgentTypes,
  listPlannedAgentTypes,
  listTemplateAgentTypes,
} from './registry';

// @vitest-environment node
import { describe, expect, it } from 'vitest';

const interviewer = getAgentType('interviewer')!;

const answers = {
  stilling: 'Butikkmedarbeider',
  bransje: 'Varehandel (privat)',
  bedrift: 'Nærbutikken AS',
  intervjutype: 'første intervju',
  intervjuer: 'butikksjef, vennlig',
  jobbsoker: 'under 25, lite erfaring',
  vanskelighetsgrad: 'lett',
  egneSporsmal: 'ingen',
};

describe('getAgentType', () => {
  it('knows the interviewer', () => {
    expect(interviewer.id).toBe('interviewer');
    expect(interviewer.fields.map((f) => f.label)).toContain('Stilling');
  });

  it('returns undefined for an unknown type', () => {
    expect(getAgentType('nope')).toBeUndefined();
  });
});

describe('listAgentTypes', () => {
  it('lists every agent type', () => {
    expect(listAgentTypes()).toEqual([interviewer]);
  });
});

describe('the agent types a counsellor may use', () => {
  it('are every type, for every counsellor, for now', () => {
    expect(listAccessibleAgentTypes()).toEqual(listAgentTypes());
  });

  it('can have templates when they have a template preset', () => {
    expect(listTemplateAgentTypes()).toEqual([interviewer]);
    expect(getTemplateAgentType('interviewer')).toBe(interviewer);
    expect(getTemplateAgentType('teacher')).toBeUndefined();
    expect(getTemplateAgentType('finnes-ikke')).toBeUndefined();
    expect(getTemplateAgentType(undefined)).toBeUndefined();
  });
});

describe('listPlannedAgentTypes', () => {
  it('lists the types that are coming, none of which has a definition yet', () => {
    const planned = listPlannedAgentTypes();
    expect(planned.length).toBeGreaterThan(0);
    for (const type of planned) {
      expect(getAgentType(type.id)).toBeUndefined();
      expect(type.label).not.toBe('');
    }
  });
});

// What the pages rely on, for every type, including ones added later.
describe.each(listAgentTypes().map((definition) => [definition.label, definition] as const))(
  'the %s definition',
  (_label, definition) => {
    it('has a label and a description', () => {
      expect(definition.label.trim()).not.toBe('');
      expect(definition.description.trim()).not.toBe('');
    });

    it('has fields with unique keys and labels', () => {
      const keys = definition.fields.map(({ key }) => key);
      const labels = definition.fields.map(({ label }) => label);
      expect(definition.fields.length).toBeGreaterThan(0);
      expect(new Set(keys).size).toBe(keys.length);
      expect(new Set(labels).size).toBe(labels.length);
    });

    it('only lets presets fill in fields it has', () => {
      const { template, jobSeekerProfile, legalTemplates } = definition.presets ?? {};
      for (const key of [template?.field, jobSeekerProfile, legalTemplates]) {
        if (key) expect(keys(definition)).toContain(key);
      }
    });

    it('says how to talk about its templates, if it has them', () => {
      const text = definition.presets?.template?.text;
      if (!text) return;
      for (const value of Object.values(text)) expect(value.trim()).not.toBe('');
    });

    it('builds a prompt, roles and a name from a full set of answers', () => {
      const filled = Object.fromEntries(definition.fields.map(({ key }) => [key, `svar-${key}`]));
      expect(definition.buildPrompt(filled).trim()).not.toBe('');
      expect(definition.buildRoles('Navn', filled).length).toBeGreaterThan(0);
      expect(definition.defaultName(filled).trim()).not.toBe('');
    });
  },
);

function keys(definition: { fields: { key: string }[] }): string[] {
  return definition.fields.map(({ key }) => key);
}

describe('hasAllAnswers', () => {
  it('accepts a full set of answers', () => {
    expect(hasAllAnswers(interviewer, answers)).toBe(true);
  });

  it('rejects a missing or blank answer', () => {
    expect(hasAllAnswers(interviewer, { ...answers, bransje: '  ' })).toBe(false);
    expect(hasAllAnswers(interviewer, { ...answers, stilling: undefined })).toBe(false);
  });

  it('lets the optional Tillegg be empty or missing, as in agents saved before it existed', () => {
    expect(hasAllAnswers(interviewer, { ...answers, tillegg: '' })).toBe(true);
    expect(hasAllAnswers(interviewer, answers)).toBe(true);
    expect(hasAllAnswers(interviewer, { ...answers, tillegg: 42 })).toBe(false);
  });

  it('rejects things that are not objects', () => {
    expect(hasAllAnswers(interviewer, null)).toBe(false);
    expect(hasAllAnswers(interviewer, 'tekst')).toBe(false);
  });
});

describe('the interviewer type', () => {
  it('names the agent after the job title only, without an industry template’s description', () => {
    expect(interviewer.defaultName(answers)).toBe('Intervjuer for Butikkmedarbeider');
    expect(
      interviewer.defaultName({
        ...answers,
        stilling: 'Helsefagarbeider. Helsefagarbeider på sykehjem eller i hjemmetjenesten.',
      }),
    ).toBe('Intervjuer for Helsefagarbeider');
  });

  it('puts the answers into the prompt and the role', () => {
    expect(interviewer.buildPrompt(answers)).toContain('Stilling: Butikkmedarbeider');
    expect(interviewer.buildRoles('Ola', answers)).toEqual([
      { name: 'Ola', description: 'butikksjef, vennlig' },
    ]);
  });
});
