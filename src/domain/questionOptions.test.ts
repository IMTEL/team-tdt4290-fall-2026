// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { formatAnswer, parseQuestionOptions } from './questionOptions';

// A question with one answer allowed, the way prompts/configurator.nb.md asks for it.
const singleChoiceReply = `Flott! Er arbeidsgiveren offentlig eller privat?

[ALTERNATIVER: ett]
1. Offentlig
2. Privat`;

describe('parseQuestionOptions', () => {
  it('splits the text from a single-choice block', () => {
    expect(parseQuestionOptions(singleChoiceReply)).toEqual({
      text: 'Flott! Er arbeidsgiveren offentlig eller privat?',
      options: {
        multiple: false,
        choices: [
          { number: 1, label: 'Offentlig' },
          { number: 2, label: 'Privat' },
        ],
      },
    });
  });

  it('reads a multiple-choice block', () => {
    const reply = singleChoiceReply.replace('ett', 'flere');
    expect(parseQuestionOptions(reply).options?.multiple).toBe(true);
  });

  it('keeps the numbers the agent wrote, even when they skip one', () => {
    const reply = 'Hvem?\n[ALTERNATIVER: ett]\n1. HR\n3. Leder';
    expect(parseQuestionOptions(reply).options?.choices).toEqual([
      { number: 1, label: 'HR' },
      { number: 3, label: 'Leder' },
    ]);
  });

  it('accepts "1)" numbering, spacing and lower case in the marker', () => {
    const reply = 'Hvem?\n  [alternativer:  flere ]  \n1) HR\n 2)  Leder ';
    expect(parseQuestionOptions(reply).options).toEqual({
      multiple: true,
      choices: [
        { number: 1, label: 'HR' },
        { number: 2, label: 'Leder' },
      ],
    });
  });

  it('keeps lines after the options that are not options in the text', () => {
    const reply = `${singleChoiceReply}\n\nDu kan også svare med egne ord.`;
    expect(parseQuestionOptions(reply).text).toBe(
      'Flott! Er arbeidsgiveren offentlig eller privat?\n\nDu kan også svare med egne ord.',
    );
  });

  it('returns the whole reply and no options when there is no marker', () => {
    const reply = 'Hvilken stilling?\n1. Kokk\n2. Servitør';
    expect(parseQuestionOptions(reply)).toEqual({ text: reply, options: null });
  });

  it('returns no options when the marker has no numbered lines after it', () => {
    const reply = 'Hvilken stilling?\n[ALTERNATIVER: ett]';
    expect(parseQuestionOptions(reply)).toEqual({ text: reply, options: null });
  });
});

describe('formatAnswer', () => {
  const hr = { number: 1, label: 'HR' };
  const colleague = { number: 3, label: 'Kollega' };

  it('writes one chosen option with its number', () => {
    expect(formatAnswer([hr])).toBe('1. HR');
  });

  it('joins several chosen options', () => {
    expect(formatAnswer([hr, colleague])).toBe('1. HR, 3. Kollega');
  });

  it('adds the counsellor’s own words after the options', () => {
    expect(formatAnswer([hr], ' rolig stil ')).toBe('1. HR. Annet: rolig stil');
  });

  it('sends only the own words when nothing is chosen', () => {
    expect(formatAnswer([], 'en rolig intervjuer')).toBe('en rolig intervjuer');
  });
});
