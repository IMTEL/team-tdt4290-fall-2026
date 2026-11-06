import { describe, expect, it } from 'vitest';

import {
  builtInLegalParagraphs,
  builtInLegalTemplateIds,
  builtInLegalTemplates,
  legalParagraphPlaceholders,
  findBuiltInLegalTemplate,
  inferSourceIds,
  normalizeLegalTemplateIds,
  paragraphsForTemplate,
  STANDARD_LEGAL_TEMPLATE_ID,
  standardLegalTemplate,
} from './legal-templates';

describe('built-in legal templates', () => {
  it('has one standard template, made of one paragraph per Norwegian law with a source', () => {
    expect(builtInLegalTemplates).toEqual([standardLegalTemplate]);
    expect(builtInLegalParagraphs.every((paragraph) => paragraph.builtIn)).toBe(true);
    expect(builtInLegalParagraphs.every((paragraph) => paragraph.jurisdiction === 'NO')).toBe(true);
    expect(
      builtInLegalParagraphs.every(
        (paragraph) => paragraph.sourceUrl && /^https:\/\//.test(paragraph.sourceUrl),
      ),
    ).toBe(true);
    expect(builtInLegalParagraphs.every((paragraph) => paragraph.title.includes('§'))).toBe(true);
    expect(standardLegalTemplate.text).toContain(builtInLegalParagraphs[0]?.title);
    expect(legalParagraphPlaceholders.every((paragraph) => paragraph.placeholder)).toBe(true);
    expect(legalParagraphPlaceholders.every((paragraph) => paragraph.jurisdiction === 'EU')).toBe(
      true,
    );
    expect(standardLegalTemplate.text).not.toContain(legalParagraphPlaceholders[0]?.title);
  });

  it('starts a new interviewer with the standard template, which has every paragraph', () => {
    expect(builtInLegalTemplateIds()).toEqual([STANDARD_LEGAL_TEMPLATE_ID]);
    expect(paragraphsForTemplate(standardLegalTemplate)).toEqual(builtInLegalParagraphs);
  });

  it('reads old per-paragraph ticks as the standard template', () => {
    expect(
      normalizeLegalTemplateIds(builtInLegalParagraphs.map((paragraph) => paragraph.id)),
    ).toEqual([STANDARD_LEGAL_TEMPLATE_ID]);
    expect(normalizeLegalTemplateIds([STANDARD_LEGAL_TEMPLATE_ID, 'legal-1'])).toEqual([
      STANDARD_LEGAL_TEMPLATE_ID,
      'legal-1',
    ]);
    expect(normalizeLegalTemplateIds(['legal-1'])).toEqual(['legal-1']);
    expect(normalizeLegalTemplateIds(['builtin-legal-gdpr-9'])).toEqual([
      STANDARD_LEGAL_TEMPLATE_ID,
    ]);
  });

  it('finds the standard template and a paragraph by id', () => {
    expect(findBuiltInLegalTemplate(STANDARD_LEGAL_TEMPLATE_ID)).toEqual(standardLegalTemplate);
    expect(findBuiltInLegalTemplate(builtInLegalParagraphs[0]!.id)).toEqual(
      builtInLegalParagraphs[0],
    );
  });

  it('ticks paragraphs whose titles are still in a saved text', () => {
    const first = builtInLegalParagraphs[0]!;
    expect(inferSourceIds(`${first.title}:\n${first.text}\n\nEgen regel.`)).toEqual([first.id]);
    expect(inferSourceIds('Bare en egen regel.')).toEqual([]);
  });
});
