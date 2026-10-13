// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { parseConfiguration } from './configuration';

// A reply that ends with a complete block, the way prompts/configurator.nb.md asks for it.
// This one has no Intervjuer line, as when a template decides the interviewer.
const completeReply = `Takk! Da har jeg det jeg trenger.

KONFIGURASJON
Stilling: Butikkmedarbeider
Bransje: Varehandel (privat)
Bedrift: Nærbutikken AS
Intervjutype: første intervju
Jobbsøker: under 25, lite erfaring, godt norsknivå, øve på å fortelle om egne styrker
Vanskelighetsgrad: lett | Antall spørsmål: 6 | Oppfølgingsspørsmål: ja
Egne spørsmål: ingen`;

const interviewer = 'Intervjueren er teamleder.';

// Without a template, the configurator asks about the interviewer and writes the line itself.
const replyWithInterviewer = completeReply.replace(
  'Intervjutype: første intervju',
  'Intervjutype: første intervju\nIntervjuer: butikksjef, vennlig',
);

describe('parseConfiguration', () => {
  it('reads every field of a complete block, and takes the interviewer from the template', () => {
    expect(parseConfiguration(completeReply, { intervjuer: interviewer })).toEqual({
      stilling: 'Butikkmedarbeider',
      bransje: 'Varehandel (privat)',
      bedrift: 'Nærbutikken AS',
      intervjutype: 'første intervju',
      intervjuer: 'Intervjueren er teamleder.',
      jobbsoker: 'under 25, lite erfaring, godt norsknivå, øve på å fortelle om egne styrker',
      vanskelighetsgrad: 'lett | Antall spørsmål: 6 | Oppfølgingsspørsmål: ja',
      egneSporsmal: 'ingen',
    });
  });

  it('reads the Intervjuer line when there is no template', () => {
    expect(parseConfiguration(replyWithInterviewer)?.intervjuer).toBe('butikksjef, vennlig');
  });

  it('uses the template over an Intervjuer line in the block', () => {
    expect(parseConfiguration(replyWithInterviewer, { intervjuer: interviewer })?.intervjuer).toBe(
      interviewer,
    );
  });

  it('returns null without a template when the Intervjuer line is missing', () => {
    expect(parseConfiguration(completeReply)).toBeNull();
  });

  it('returns null for an ordinary reply without a block', () => {
    expect(
      parseConfiguration('Hvilken bransje er stillingen i?', { intervjuer: interviewer }),
    ).toBeNull();
  });

  it('returns null when a line is missing', () => {
    const withoutCompany = completeReply.replace('Bedrift: Nærbutikken AS\n', '');
    expect(parseConfiguration(withoutCompany, { intervjuer: interviewer })).toBeNull();
  });

  it('returns null when a line has no value', () => {
    const emptyCompany = completeReply.replace('Bedrift: Nærbutikken AS', 'Bedrift:');
    expect(parseConfiguration(emptyCompany, { intervjuer: interviewer })).toBeNull();
  });

  it('ignores spaces at the start and end of lines', () => {
    const indented = completeReply.replace(
      'Stilling: Butikkmedarbeider',
      '   Stilling:  Butikkmedarbeider  ',
    );
    expect(parseConfiguration(indented, { intervjuer: interviewer })?.stilling).toBe(
      'Butikkmedarbeider',
    );
  });

  it('takes the job seeker from a profile, and then needs no Jobbsøker line', () => {
    const jobSeeker = 'aldersgruppe 18–24 år; vil øve på: mestre nervøsitet';
    const withoutJobSeeker = completeReply.replace(/^Jobbsøker:.*\n/m, '');

    const configuration = parseConfiguration(withoutJobSeeker, {
      intervjuer: interviewer,
      jobbsoker: jobSeeker,
    });

    expect(configuration?.jobbsoker).toBe(jobSeeker);
    expect(configuration?.intervjuer).toBe(interviewer);
    expect(parseConfiguration(replyWithInterviewer, { jobbsoker: jobSeeker })?.jobbsoker).toBe(
      jobSeeker,
    );
  });
});
