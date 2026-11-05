// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { buildBriefing, decidedFields, firstQuestion, parseAnswers } from './configurator';
import { interviewer } from './interviewer';
import type { AgentTypeDefinition } from './types';

// A made-up type, to show that a new type needs nothing but its definition.
const teacher: AgentTypeDefinition = {
  id: 'teacher',
  label: 'Lærer',
  description: 'En samtale med en lærer.',
  fields: [
    { key: 'fag', label: 'Fag', question: 'Hvilket fag gjelder det?' },
    {
      key: 'niva',
      label: 'Nivå',
      question: 'Hvilket nivå er eleven på?',
      hint: 'For eksempel ungdomsskole eller videregående.',
      format: 'ungdomsskole/videregående',
    },
  ],
  configurator: {
    purpose: 'en AI-lærer som elever kan øve muntlig eksamen med',
    greeting: 'Hei! Jeg hjelper deg med å sette opp en AI-lærer.',
    rules: ['Læreren skal aldri gi karakter.'],
  },
  buildPrompt: (answers) => `Du er lærer i ${answers.fag}.`,
  buildSummary: (answers) => `En lærer i ${answers.fag}.`,
  explainAnswers: () => [],
  buildRoles: (name) => [{ name, description: 'Lærer' }],
  defaultName: (answers) => `Lærer i ${answers.fag}`,
};

// A reply that ends with a complete block, the way the briefing asks for it.
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

const persona = 'Intervjueren er teamleder.';

// Without a template, the configurator asks about the interviewer and writes the line itself.
const replyWithInterviewer = completeReply.replace(
  'Intervjutype: første intervju',
  'Intervjutype: første intervju\nIntervjuer: butikksjef, vennlig',
);

describe('decidedFields', () => {
  it('gives the fields the chosen template and profile fill in', () => {
    expect(decidedFields(interviewer, { template: true, jobSeekerProfile: true })).toEqual([
      'intervjuer',
      'jobbsoker',
    ]);
    expect(decidedFields(interviewer, { jobSeekerProfile: true })).toEqual(['jobbsoker']);
    expect(decidedFields(interviewer, { template: false })).toEqual([]);
  });

  it('gives both fields an industry template fills in, in the type’s field order', () => {
    expect(decidedFields(interviewer, { template: true, jobTemplate: true })).toEqual([
      'stilling',
      'bransje',
      'intervjuer',
    ]);
  });

  it('decides nothing for a type without presets', () => {
    expect(decidedFields(teacher, { template: true })).toEqual([]);
  });
});

describe('firstQuestion', () => {
  it('asks the first field that is not decided', () => {
    expect(firstQuestion(interviewer, [])).toBe('Hvilken stilling skal jobbsøkeren øve til?');
    expect(firstQuestion(teacher, ['fag'])).toBe('Hvilket nivå er eleven på?');
    // With an industry template, the job and industry are known, so it asks about the company.
    expect(firstQuestion(interviewer, ['stilling', 'bransje'])).toBe(
      'Hvilken bedrift eller virksomhet skal intervjuet være hos?',
    );
  });
});

describe('buildBriefing', () => {
  it('lists the questions in order, with hints, and the block to end with', () => {
    const briefing = buildBriefing(teacher);

    expect(briefing).toContain('Veilederen skal sette opp en AI-lærer som elever kan øve');
    expect(briefing).toContain(
      '1. Fag: Hvilket fag gjelder det?\n' +
        '2. Nivå: Hvilket nivå er eleven på? For eksempel ungdomsskole eller videregående.',
    );
    expect(briefing).toContain('- Læreren skal aldri gi karakter.');
    expect(briefing).toMatch(/KONFIGURASJON\nFag: …\nNivå: ungdomsskole\/videregående$/);
  });

  it('leaves decided fields out of the questions and the block', () => {
    const briefing = buildBriefing(interviewer, { intervjuer: persona, jobbsoker: 'under 25' });

    expect(briefing).not.toContain('Hvilken rolle og stil skal intervjueren ha?');
    expect(briefing).not.toMatch(/^Intervjuer:/m);
    expect(briefing).not.toMatch(/^Jobbsøker:/m);
    expect(briefing).toContain('5. Vanskelighetsgrad:');
  });

  it('gives the configurator the text of what is decided, to fit the rest to', () => {
    const briefing = buildBriefing(interviewer, {
      stilling: 'Helsefagarbeider. Pleie og omsorg på sykehjem.',
      bransje: 'Helse og omsorg (offentlig)',
      intervjuer: persona,
    });

    expect(briefing).toContain(
      '## Allerede bestemt før samtalen\n' +
        'Veilederen har valgt dette med maler og profiler. Ikke spør om det, men bruk det',
    );
    // Both the industry template and the interviewer template, in the type's field order.
    expect(briefing).toContain(
      '- Stilling: Helsefagarbeider. Pleie og omsorg på sykehjem.\n' +
        '- Bransje: Helse og omsorg (offentlig)\n' +
        `- Intervjuer: ${persona}`,
    );
    expect(briefing).toContain('1. Bedrift: Hvilken bedrift eller virksomhet');
    expect(briefing).toMatch(/KONFIGURASJON\nBedrift: navn \| Visjon og verdier: …\n/);
  });

  it('has no decided section when nothing is decided', () => {
    expect(buildBriefing(interviewer)).not.toContain('Allerede bestemt');
    expect(buildBriefing(interviewer, { intervjuer: '' })).not.toContain('Allerede bestemt');
  });

  it('marks optional fields, so the configurator offers to skip them and may leave the line out', () => {
    const briefing = buildBriefing(interviewer);

    expect(briefing).toContain('9. Tillegg (valgfritt): Er det noe mer du vil legge til?');
    expect(briefing).toMatch(
      /^Tillegg: … \(valgfritt: utelat linjen hvis ingenting ble lagt til\)$/m,
    );
    expect(briefing).not.toContain('Stilling (valgfritt)');
  });

  it('has the interviewer’s own rules', () => {
    expect(buildBriefing(interviewer)).toContain('Ikke finn på fakta om ekte bedrifter.');
  });
});

describe('parseAnswers', () => {
  it('reads every field of a complete block, and takes the interviewer from the template', () => {
    expect(parseAnswers(completeReply, interviewer, { intervjuer: persona })).toEqual({
      stilling: 'Butikkmedarbeider',
      bransje: 'Varehandel (privat)',
      bedrift: 'Nærbutikken AS',
      intervjutype: 'første intervju',
      intervjuer: persona,
      jobbsoker: 'under 25, lite erfaring, godt norsknivå, øve på å fortelle om egne styrker',
      vanskelighetsgrad: 'lett | Antall spørsmål: 6 | Oppfølgingsspørsmål: ja',
      egneSporsmal: 'ingen',
      tillegg: '',
      lovverk: '',
    });
  });

  it('reads what the counsellor added, and leaves it empty when the line is missing', () => {
    const withAdditions = `${completeReply}
Tillegg: Snakk sakte og tydelig.`;
    expect(parseAnswers(withAdditions, interviewer, { intervjuer: persona })?.tillegg).toBe(
      'Snakk sakte og tydelig.',
    );
    expect(parseAnswers(completeReply, interviewer, { intervjuer: persona })?.tillegg).toBe('');
  });

  it('never asks about or reads Lovverk, which only legal templates fill in', () => {
    const briefing = buildBriefing(interviewer);
    expect(briefing).not.toContain('Lovverk');

    const withLaw = `${completeReply}\nLovverk: noe assistenten fant på`;
    expect(parseAnswers(withLaw, interviewer, { intervjuer: persona })?.lovverk).toBe('');
    expect(
      parseAnswers(withLaw, interviewer, { intervjuer: persona, lovverk: 'Fra malen' })?.lovverk,
    ).toBe('Fra malen');
  });

  it('reads the fields of any type', () => {
    const reply = 'Flott.\n\nKONFIGURASJON\nFag: Norsk\nNivå: videregående';
    expect(parseAnswers(reply, teacher)).toEqual({ fag: 'Norsk', niva: 'videregående' });
  });

  it('reads the Intervjuer line when there is no template', () => {
    expect(parseAnswers(replyWithInterviewer, interviewer)?.intervjuer).toBe('butikksjef, vennlig');
  });

  it('uses the template over an Intervjuer line in the block', () => {
    expect(
      parseAnswers(replyWithInterviewer, interviewer, { intervjuer: persona })?.intervjuer,
    ).toBe(persona);
  });

  it('returns null without a template when the Intervjuer line is missing', () => {
    expect(parseAnswers(completeReply, interviewer)).toBeNull();
  });

  it('returns null for an ordinary reply without a block', () => {
    expect(
      parseAnswers('Hvilken bransje er stillingen i?', interviewer, { intervjuer: persona }),
    ).toBeNull();
  });

  it('returns null when a line is missing', () => {
    const withoutCompany = completeReply.replace('Bedrift: Nærbutikken AS\n', '');
    expect(parseAnswers(withoutCompany, interviewer, { intervjuer: persona })).toBeNull();
  });

  it('returns null when a line has no value', () => {
    const emptyCompany = completeReply.replace('Bedrift: Nærbutikken AS', 'Bedrift:');
    expect(parseAnswers(emptyCompany, interviewer, { intervjuer: persona })).toBeNull();
  });

  it('ignores spaces at the start and end of lines', () => {
    const indented = completeReply.replace(
      'Stilling: Butikkmedarbeider',
      '   Stilling:  Butikkmedarbeider  ',
    );
    expect(parseAnswers(indented, interviewer, { intervjuer: persona })?.stilling).toBe(
      'Butikkmedarbeider',
    );
  });

  it('takes the job and industry from an industry template, without lines for them', () => {
    const withoutJob = replyWithInterviewer
      .replace('Stilling: Butikkmedarbeider\n', '')
      .replace('Bransje: Varehandel (privat)\n', '');
    const industry = { stilling: 'Servitør.', bransje: 'Hotell og restaurant (privat)' };

    expect(parseAnswers(withoutJob, interviewer, industry)).toMatchObject(industry);
    // And the template wins over lines the configurator writes anyway.
    expect(parseAnswers(replyWithInterviewer, interviewer, industry)).toMatchObject(industry);
  });

  it('takes the job seeker from a profile, and then needs no Jobbsøker line', () => {
    const jobSeeker = 'aldersgruppe 18–24 år; vil øve på: mestre nervøsitet';
    const withoutJobSeeker = completeReply.replace(/^Jobbsøker:.*\n/m, '');

    const answers = parseAnswers(withoutJobSeeker, interviewer, {
      intervjuer: persona,
      jobbsoker: jobSeeker,
    });

    expect(answers?.jobbsoker).toBe(jobSeeker);
    expect(answers?.intervjuer).toBe(persona);
  });
});
