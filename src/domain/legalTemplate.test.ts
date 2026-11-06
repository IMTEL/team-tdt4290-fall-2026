import { describe, expect, it } from 'vitest';

import type { LegalTemplate } from './legalTemplate';
import {
  composeLegalTemplateText,
  describeLegalFrameworks,
  groupLegalTemplates,
} from './legalTemplate';

const no: LegalTemplate = {
  id: 'no-1',
  title: 'Arbeidsmiljøloven § 9-3',
  description: 'Helse',
  text: 'Ikke spør om helse.',
  builtIn: true,
  jurisdiction: 'NO',
};
const eu: LegalTemplate = {
  id: 'eu-1',
  title: 'Personvernforordningen art. 9',
  description: 'Særlige kategorier',
  text: 'Ikke be om helseopplysninger.',
  builtIn: true,
  jurisdiction: 'EU',
};
const own: LegalTemplate = {
  id: 'own-1',
  title: 'Intern regel',
  description: 'Egen',
  text: 'Ikke spør om familie.',
  builtIn: false,
};

describe('groupLegalTemplates', () => {
  it('puts Norge, EU and own templates in that order, and leaves empty groups out', () => {
    expect(groupLegalTemplates([own, eu, no]).map((group) => group.id)).toEqual([
      'NO',
      'EU',
      'own',
    ]);
    expect(groupLegalTemplates([no])[0]).toMatchObject({
      id: 'NO',
      label: 'Norge',
      templates: [no],
    });
    expect(groupLegalTemplates([own])[0]?.label).toBe('Eget lovverk');
    expect(groupLegalTemplates([])).toEqual([]);
  });
});

describe('describeLegalFrameworks', () => {
  it('gives each title and its text, in order', () => {
    expect(describeLegalFrameworks([no, { title: 'B', description: '', text: 'Tekst B' }])).toBe(
      'Arbeidsmiljøloven § 9-3:\nIkke spør om helse.\n\nB:\nTekst B',
    );
  });
});

describe('composeLegalTemplateText', () => {
  it('joins ticked paragraphs and an extra rule', () => {
    expect(composeLegalTemplateText([no], 'Ikke spør om familie.')).toBe(
      'Arbeidsmiljøloven § 9-3:\nIkke spør om helse.\n\nIkke spør om familie.',
    );
    expect(composeLegalTemplateText([], '  Egen regel.  ')).toBe('Egen regel.');
  });
});
