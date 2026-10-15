// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { buildInterviewerSummary } from './interviewerSummary';

const answers = {
  stilling: 'Butikkmedarbeider',
  bransje: 'Varehandel (privat)',
  bedrift: 'Nærbutikken AS',
  intervjutype: 'første intervju',
  intervjuer: 'Intervjueren er teamleder.',
  jobbsoker: 'aldersgruppe 18–24 år; arbeidserfaring: ingen arbeidserfaring',
  vanskelighetsgrad: 'lett | Antall spørsmål: 6 | Oppfølgingsspørsmål: ja',
  egneSporsmal: 'ingen',
};

/** The answers with some of them changed. */
function withChanges(changes: Partial<Record<keyof typeof answers, string>>) {
  return { ...answers, ...changes };
}

/** The number of sentences, counted by their full stops. */
function sentenceCount(text: string): number {
  return text.split(/\.(?:\s|$)/).filter((sentence) => sentence.trim() !== '').length;
}

describe('buildInterviewerSummary', () => {
  it('says who it is for, what kind of interview it is, and who it is made for', () => {
    expect(buildInterviewerSummary(answers)).toBe(
      'Dette er en intervjuer for stillingen butikkmedarbeider i bransjen varehandel (privat). ' +
        'Det er et første intervju med vanskelighetsgrad lett. ' +
        'Jobbsøkeren er beskrevet slik: aldersgruppe 18–24 år; arbeidserfaring: ingen arbeidserfaring.',
    );
  });

  it('is never more than three sentences, one for each part', () => {
    expect(sentenceCount(buildInterviewerSummary(answers))).toBe(3);
    expect(sentenceCount(buildInterviewerSummary(withChanges({ jobbsoker: '' })))).toBe(2);
  });

  describe('who it is for', () => {
    it('leaves out the industry when it is empty', () => {
      expect(buildInterviewerSummary(withChanges({ bransje: '' }))).toContain(
        'Dette er en intervjuer for stillingen butikkmedarbeider. ',
      );
    });

    it('leaves out the position when it is empty', () => {
      expect(buildInterviewerSummary(withChanges({ stilling: '  ' }))).toContain(
        'Dette er en intervjuer i bransjen varehandel (privat). ',
      );
    });

    it('leaves out the sentence when both are empty', () => {
      const summary = buildInterviewerSummary(withChanges({ stilling: '', bransje: '' }));
      expect(summary).not.toContain('Dette er en intervjuer');
      expect(summary.startsWith('Det er et første intervju')).toBe(true);
    });

    it('keeps words written in capitals, such as IKT', () => {
      expect(buildInterviewerSummary(withChanges({ bransje: 'IKT (privat)' }))).toContain(
        'i bransjen IKT (privat)',
      );
    });

    it('does not count "ingen" or "ikke oppgitt" as an answer', () => {
      const summary = buildInterviewerSummary(
        withChanges({ stilling: 'Ikke oppgitt', bransje: 'Ingen' }),
      );
      expect(summary).not.toContain('Dette er en intervjuer');
    });

    it('ignores spaces and a full stop at the end of an answer', () => {
      expect(buildInterviewerSummary(withChanges({ stilling: '  Kokk. ' }))).toContain(
        'for stillingen kokk i bransjen',
      );
    });
  });

  describe('the interview', () => {
    it('says the type and the level of difficulty', () => {
      expect(buildInterviewerSummary(withChanges({ intervjutype: 'andre intervju' }))).toContain(
        'Det er et andre intervju med vanskelighetsgrad lett.',
      );
    });

    it('uses only the level when the chat added the number of questions', () => {
      const summary = buildInterviewerSummary(
        withChanges({
          vanskelighetsgrad: 'krevende | Antall spørsmål: 8 | Oppfølgingsspørsmål: nei',
        }),
      );
      expect(summary).toContain('med vanskelighetsgrad krevende.');
      expect(summary).not.toContain('Antall spørsmål');
    });

    it('says the level alone when there is no type', () => {
      expect(buildInterviewerSummary(withChanges({ intervjutype: '' }))).toContain(
        'Vanskelighetsgraden er lett.',
      );
    });

    it('says the type alone when there is no level', () => {
      expect(buildInterviewerSummary(withChanges({ vanskelighetsgrad: '' }))).toContain(
        'Det er et første intervju. ',
      );
    });

    it('does not say "et" before a type that is not written as "... intervju"', () => {
      const summary = buildInterviewerSummary(withChanges({ intervjutype: 'bli-kjent-samtale' }));
      expect(summary).toContain('Intervjutypen er bli-kjent-samtale, med vanskelighetsgrad lett.');
    });

    it('leaves out the sentence when there is neither type nor level', () => {
      const summary = buildInterviewerSummary(
        withChanges({ intervjutype: '', vanskelighetsgrad: '' }),
      );
      expect(summary).not.toContain('intervju.');
      expect(summary).not.toContain('Vanskelighetsgraden');
    });
  });

  describe('the job seeker', () => {
    it('leaves out the sentence when there is no description', () => {
      expect(buildInterviewerSummary(withChanges({ jobbsoker: '' }))).not.toContain('Jobbsøkeren');
    });

    it('leaves out the sentence when a profile had nothing to say', () => {
      const summary = buildInterviewerSummary(
        withChanges({ jobbsoker: 'ingen opplysninger om jobbsøkeren' }),
      );
      expect(summary).not.toContain('Jobbsøkeren');
    });

    it('cuts a long description after a whole part', () => {
      const parts = [
        'aldersgruppe 25–29 år',
        'arbeidserfaring: noe (1–5 år), lager og butikk',
        'utdanning: videregående, studiespesialisering med realfag',
        'språk: norsk B1, engelsk',
        'vil øve på: mestre nervøsitet, fortelle om seg selv',
      ];
      const summary = buildInterviewerSummary(withChanges({ jobbsoker: parts.join('; ') }));

      // The first four parts are 153 characters, and the fifth would take it past 160.
      expect(summary).toContain(`${parts.slice(0, 4).join('; ')}…`);
      expect(summary).not.toContain('vil øve på');
      expect(summary.endsWith('…')).toBe(true);
    });

    it('cuts a single long part in the middle', () => {
      const summary = buildInterviewerSummary(withChanges({ jobbsoker: 'a'.repeat(300) }));
      expect(summary).toContain(`${'a'.repeat(160)}…`);
      expect(summary).not.toContain('a'.repeat(161));
    });
  });

  it('is empty when nothing is known', () => {
    const empty = Object.fromEntries(Object.keys(answers).map((key) => [key, '']));
    expect(buildInterviewerSummary(empty)).toBe('');
  });

  it('does not fail on answers that are missing altogether', () => {
    expect(buildInterviewerSummary({})).toBe('');
  });

  it('does not use the company name, the interviewer text or the own questions', () => {
    const summary = buildInterviewerSummary(
      withChanges({
        bedrift: 'Hemmelig AS',
        intervjuer: 'Teksten om teamleder',
        egneSporsmal: 'Hvorfor?',
      }),
    );
    expect(summary).not.toContain('Hemmelig AS');
    expect(summary).not.toContain('Teksten om teamleder');
    expect(summary).not.toContain('Hvorfor?');
  });
});
