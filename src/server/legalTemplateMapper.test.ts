// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { describeLegalFrameworks } from '@/domain/legalTemplate';
import {
  fromRagdollLegalTemplate,
  parseNewLegalTemplate,
  toRagdollLegalTemplate,
} from './legalTemplateMapper';

const template = {
  title: 'Arbeidsmiljøloven § 9-3',
  description: 'Helseopplysninger ved ansettelse.',
  text: 'Ikke spør om helse.',
};

describe('parseNewLegalTemplate', () => {
  it('keeps only our fields, trimmed', () => {
    expect(
      parseNewLegalTemplate({ ...template, title: '  Arbeidsmiljøloven § 9-3 ', owner: 'x' }),
    ).toEqual(template);
  });

  it('refuses a missing, empty or too long field', () => {
    expect(parseNewLegalTemplate({ ...template, title: undefined })).toBeNull();
    expect(parseNewLegalTemplate({ ...template, description: '   ' })).toBeNull();
    expect(parseNewLegalTemplate({ ...template, text: 'x'.repeat(4001) })).toBeNull();
    expect(parseNewLegalTemplate(null)).toBeNull();
  });
});

describe('toRagdollLegalTemplate and fromRagdollLegalTemplate', () => {
  it('stores the template with its own type and reads it back', () => {
    const stored = { id: 'legal-1', ...toRagdollLegalTemplate(template) };
    expect(stored.type).toBe('legal-framework');
    expect(fromRagdollLegalTemplate(stored)).toEqual({
      id: 'legal-1',
      ...template,
      builtIn: false,
    });
  });

  it('stores the ticked paragraphs and reads them back', () => {
    const withSources = { ...template, sourceIds: ['builtin-legal-aml-9-3'] };
    const stored = { id: 'legal-1', ...toRagdollLegalTemplate(withSources) };
    expect(stored.content).toEqual({
      text: template.text,
      sourceIds: ['builtin-legal-aml-9-3'],
    });
    expect(fromRagdollLegalTemplate(stored)).toEqual({
      id: 'legal-1',
      ...withSources,
      builtIn: false,
    });
  });

  it('reads a template of another type, or without text, as none', () => {
    const stored = { id: 'legal-1', ...toRagdollLegalTemplate(template) };
    expect(fromRagdollLegalTemplate({ ...stored, type: 'interviewer' })).toBeNull();
    expect(fromRagdollLegalTemplate({ ...stored, content: {} })).toBeNull();
  });
});

describe('describeLegalFrameworks', () => {
  it('gives each title and its text, in order', () => {
    expect(
      describeLegalFrameworks([template, { title: 'B', description: '', text: 'Tekst B' }]),
    ).toBe('Arbeidsmiljøloven § 9-3:\nIkke spør om helse.\n\nB:\nTekst B');
  });
});
