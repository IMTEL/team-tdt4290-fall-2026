// @vitest-environment node
import { describe, expect, it } from 'vitest';

import type { Configuration } from './configuration';
import { explainInterviewer, interviewerAdaptations } from './interviewerAdaptations';
import { buildPrompt } from './interviewerPrompt';

// As the wizard on /configure saves them.
const configuration: Configuration = {
  stilling: 'Butikkmedarbeider',
  bransje: 'Varehandel (privat)',
  bedrift: 'Nærbutikken AS',
  intervjutype: 'første intervju',
  intervjuer: 'Intervjueren er butikksjef og vennlig.',
  jobbsoker: 'aldersgruppe 18–24 år; vil øve på: mestre nervøsitet, forklare hull i cv-en',
  vanskelighetsgrad: 'lett | Antall spørsmål: 5–6 | Oppfølgingsspørsmål: ja',
  egneSporsmal: 'ingen',
  tillegg: '',
  lovverk: '',
};

function effectsFor(changes: Partial<Configuration>, key: keyof Configuration): string[] {
  return (
    explainInterviewer({ ...configuration, ...changes }).find((g) => g.key === key)?.effects ?? []
  );
}

describe('interviewerAdaptations', () => {
  it('puts every instruction in the prompt, so the effects are never only words', () => {
    const answers: Configuration = {
      ...configuration,
      bedrift: 'Nærbutikken AS | Visjon og verdier: Nær kunden',
      egneSporsmal: 'Hvorfor vil du jobbe her?',
      tillegg: 'Snakk sakte.',
      lovverk: 'Arbeidsmiljøloven § 9-3',
    };
    const prompt = buildPrompt(answers);

    for (const { instruction } of interviewerAdaptations(answers)) {
      if (instruction) expect(prompt).toContain(`- ${instruction}`);
    }
  });
});

describe('explainInterviewer', () => {
  it('groups the effects by answer, in the order of the fields, with their labels', () => {
    expect(explainInterviewer(configuration).map(({ label }) => label)).toEqual([
      'Stilling',
      'Bransje',
      'Bedrift',
      'Intervjutype',
      'Intervjuer',
      'Jobbsøker',
      'Vanskelighetsgrad',
    ]);
  });

  it('leaves out answers that change nothing', () => {
    const keys = explainInterviewer(configuration).map(({ key }) => key);
    expect(keys).not.toContain('egneSporsmal');
    expect(keys).not.toContain('tillegg');
    expect(keys).not.toContain('lovverk');
  });

  it('names the job, without the job description from a stillingsmal', () => {
    expect(effectsFor({}, 'stilling')).toEqual([
      'Spørsmålene handler om stillingen butikkmedarbeider.',
    ]);
    expect(
      effectsFor({ stilling: 'Butikkmedarbeider. Selger varer og hjelper kunder.' }, 'stilling'),
    ).toEqual([
      'Spørsmålene handler om stillingen butikkmedarbeider og beskrivelsen fra stillingsmalen.',
    ]);
  });

  it('leaves out the industry when the wizard had none', () => {
    expect(effectsFor({}, 'bransje')).toEqual(['Spørsmålene er tilpasset bransjen varehandel.']);
    expect(effectsFor({ bransje: 'Ingen bransje (privat)' }, 'bransje')).toEqual([]);
  });

  it('never makes up a company name when none is given', () => {
    expect(effectsFor({ bedrift: 'ikke oppgitt' }, 'bedrift')).toEqual([
      'Ingen bedrift er oppgitt, så intervjueren finner ikke på et bedriftsnavn.',
    ]);
    expect(buildPrompt({ ...configuration, bedrift: 'ikke oppgitt' })).toContain(
      'Ikke finn på et navn på bedriften',
    );
  });

  it('asks about the vision and values the configuration chat wrote down', () => {
    expect(
      effectsFor({ bedrift: 'Nærbutikken AS | Visjon og verdier: Nær kunden' }, 'bedrift'),
    ).toEqual([
      'Intervjueren snakker på vegne av Nærbutikken AS, og bruker bare det du har skrevet om bedriften.',
      'Intervjueren spør hvordan jobbsøkeren passer til visjonen og verdiene.',
    ]);
  });

  it('tells a first interview from a second', () => {
    expect(effectsFor({}, 'intervjutype')).toEqual([
      'Et kort bli-kjent-intervju, med spørsmål fra spørsmålsbanken.',
    ]);
    expect(effectsFor({ intervjutype: 'andre intervju' }, 'intervjutype')).toEqual([
      'Et mer faglig intervju som går i dybden, med situasjoner fra stillingen.',
    ]);
    expect(effectsFor({ intervjutype: 'telefonintervju' }, 'intervjutype')).toEqual([]);
  });

  it('is neutral when no interviewer template was chosen', () => {
    expect(effectsFor({ intervjuer: 'Ingen mal' }, 'intervjuer')).toEqual([
      'Ingen mal er valgt, så intervjueren er nøytral og profesjonell.',
    ]);
  });

  it('has one effect for each practice area, and one for the areas the counsellor wrote', () => {
    expect(
      effectsFor(
        { jobbsoker: 'vil øve på: mestre nervøsitet, snakke norsk i intervju, lønnsforhandling' },
        'jobbsoker',
      ),
    ).toEqual([
      'Intervjueren holder et rolig tempo og er oppmuntrende, så jobbsøkeren kan øve på nervøsitet.',
      'Intervjueren bruker enkelt og tydelig norsk, og gir tid til å svare.',
      'Intervjueren tilpasser spørsmålene til det jobbsøkeren vil øve på: lønnsforhandling.',
    ]);
  });

  it('says nothing about a job seeker nothing is known about', () => {
    expect(effectsFor({ jobbsoker: 'ingen opplysninger om jobbsøkeren' }, 'jobbsoker')).toEqual([]);
  });

  it('adapts to a job seeker described in the configuration chat', () => {
    expect(
      effectsFor({ jobbsoker: 'under 25, lite erfaring, vil bli tryggere' }, 'jobbsoker'),
    ).toEqual(['Intervjueren tilpasser seg det som står om jobbsøkeren og det hen vil øve på.']);
  });

  it('explains the level, the number of questions and follow-up questions', () => {
    expect(effectsFor({}, 'vanskelighetsgrad')).toEqual([
      'Enkle og åpne spørsmål, og en tålmodig intervjuer.',
      '5–6 spørsmål i alt, uten oppfølgingsspørsmålene.',
      'Er et svar kort eller vagt, kan intervjueren stille ett oppfølgingsspørsmål.',
    ]);
    expect(
      effectsFor(
        { vanskelighetsgrad: 'krevende | Antall spørsmål: 12 | Oppfølgingsspørsmål: nei' },
        'vanskelighetsgrad',
      ),
    ).toEqual([
      'Mer utfordrende spørsmål, og intervjueren ber om begrunnelser.',
      '12 spørsmål i alt, uten oppfølgingsspørsmålene.',
      'Ingen oppfølgingsspørsmål: intervjueren går rett videre etter hvert svar.',
    ]);
  });

  it('reads an older answer with only the level, and still allows follow-up questions', () => {
    expect(effectsFor({ vanskelighetsgrad: 'vanskelig' }, 'vanskelighetsgrad')).toEqual([
      'Mer utfordrende spørsmål, og intervjueren ber om begrunnelser.',
      'Er et svar kort eller vagt, kan intervjueren stille ett oppfølgingsspørsmål.',
    ]);
  });

  it('explains own questions, additions and legal templates when there are any', () => {
    const answers = {
      egneSporsmal: 'Hvorfor vil du jobbe her?',
      tillegg: 'Snakk sakte.',
      lovverk: 'Arbeidsmiljøloven § 9-3',
    };
    expect(effectsFor(answers, 'egneSporsmal')).toEqual([
      'Intervjueren stiller spørsmålene du skrev, og de teller med i antallet.',
    ]);
    expect(effectsFor(answers, 'tillegg')).toEqual(['Intervjueren følger det du la til.']);
    expect(effectsFor(answers, 'lovverk')).toEqual([
      'Intervjueren stiller aldri spørsmål lovverket forbyr, og svarer kort på spørsmål om jobbsøkerens rettigheter.',
    ]);
  });
});
