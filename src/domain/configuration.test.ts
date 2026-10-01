// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { parseConfiguration } from './configuration';

// A reply that ends with a complete block, the way prompts/configurator.nb.md asks for it.
const completeReply = `Takk! Da har jeg det jeg trenger.

KONFIGURASJON
Stilling: Butikkmedarbeider
Bransje: Varehandel (privat)
Bedrift: Nærbutikken AS
Intervjutype: første intervju
Intervjuer: butikksjef, vennlig
Jobbsøker: under 25, lite erfaring, godt norsknivå, øve på å fortelle om egne styrker
Vanskelighetsgrad: lett | Antall spørsmål: 6 | Oppfølgingsspørsmål: ja
Egne spørsmål: ingen`;

describe('parseConfiguration', () => {
  it('reads every field of a complete block', () => {
    expect(parseConfiguration(completeReply)).toEqual({
      stilling: 'Butikkmedarbeider',
      bransje: 'Varehandel (privat)',
      bedrift: 'Nærbutikken AS',
      intervjutype: 'første intervju',
      intervjuer: 'butikksjef, vennlig',
      jobbsoker: 'under 25, lite erfaring, godt norsknivå, øve på å fortelle om egne styrker',
      vanskelighetsgrad: 'lett | Antall spørsmål: 6 | Oppfølgingsspørsmål: ja',
      egneSporsmal: 'ingen',
    });
  });

  it('returns null for an ordinary reply without a block', () => {
    expect(parseConfiguration('Hvilken bransje er stillingen i?')).toBeNull();
  });

  it('returns null when a line is missing', () => {
    const withoutCompany = completeReply.replace('Bedrift: Nærbutikken AS\n', '');
    expect(parseConfiguration(withoutCompany)).toBeNull();
  });

  it('returns null when a line has no value', () => {
    const emptyCompany = completeReply.replace('Bedrift: Nærbutikken AS', 'Bedrift:');
    expect(parseConfiguration(emptyCompany)).toBeNull();
  });

  it('ignores spaces at the start and end of lines', () => {
    const indented = completeReply.replace('Stilling: Butikkmedarbeider', '   Stilling:  Butikkmedarbeider  ');
    expect(parseConfiguration(indented)?.stilling).toBe('Butikkmedarbeider');
  });
});