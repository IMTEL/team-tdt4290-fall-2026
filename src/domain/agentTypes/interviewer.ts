import { LABELS, type Configuration } from '../configuration';
import { buildPrompt } from '../interviewerPrompt';
import { buildInterviewerSummary } from '../interviewerSummary';
import type { AgentTypeDefinition } from './types';

/** An interviewer for a practice job interview in The Candidate. */
export const interviewer: AgentTypeDefinition = {
  id: 'interviewer',
  label: 'Intervjuer',
  description:
    'Et øvingsintervju for en jobb, der jobbsøkeren svarer på spørsmål fra en intervjuer.',
  // In the order of LABELS, which is the order the configurator asks in.
  fields: [
    {
      key: 'stilling',
      label: LABELS.stilling,
      question: 'Hvilken stilling skal jobbsøkeren øve til?',
    },
    {
      key: 'bransje',
      label: LABELS.bransje,
      question: 'Hvilken bransje eller sektor er stillingen i?',
      hint: 'Finn også ut om arbeidsgiveren er offentlig eller privat.',
      format: '… (offentlig/privat)',
    },
    {
      key: 'bedrift',
      label: LABELS.bedrift,
      question: 'Hvilken bedrift eller virksomhet skal intervjuet være hos?',
      hint: 'Navn (valgfritt), visjon og verdier, og eventuelt nettside som kontekst.',
    },
    {
      key: 'intervjutype',
      label: LABELS.intervjutype,
      question: 'Er det et første eller et andre intervju?',
      hint: 'Første intervju er kort og bli-kjent; andre intervju er mer faglig og dyptgående.',
      format: 'første/andre intervju',
    },
    {
      key: 'intervjuer',
      label: LABELS.intervjuer,
      question: 'Hvilken rolle og stil skal intervjueren ha?',
      hint: 'For eksempel HR, leder eller kommende kollega; vennlig, nøytral eller krevende.',
      format: 'rolle, stil',
    },
    {
      key: 'jobbsoker',
      label: LABELS.jobbsoker,
      question: 'Hvem er jobbsøkeren?',
      hint:
        'Uten personopplysninger: aldersgruppe (under 25, 25–39, 40+), erfaring, språknivå i ' +
        'norsk, og hva personen trenger å øve på (for eksempel nervøsitet, hull i CV-en, å ' +
        'fortelle om egne styrker).',
      format: 'aldersgruppe, erfaring, norsknivå, øvingsmål',
    },
    {
      key: 'vanskelighetsgrad',
      label: LABELS.vanskelighetsgrad,
      question: 'Hvor vanskelig og hvor langt skal intervjuet være?',
      hint: 'Antall spørsmål (standard 6–8), og om intervjueren skal stille oppfølgingsspørsmål.',
      format: '… | Antall spørsmål: … | Oppfølgingsspørsmål: ja/nei',
    },
    {
      key: 'egneSporsmal',
      label: LABELS.egneSporsmal,
      question: 'Er det spørsmål som må være med?',
    },
  ],
  configurator: {
    purpose: 'en AI-intervjuer som jobbsøkere skal øve jobbintervju med i VR-appen «The Candidate»',
    greeting: 'Hei! Jeg hjelper deg med å sette opp en AI-intervjuer.',
    rules: [
      'Intervjueren skal tilpasse språk, tempo og vanskelighetsgrad, men aldri spørre om eller ' +
        'vurdere kjønn, alder, helse, religion, etnisitet, seksuell orientering eller andre ' +
        'beskyttede egenskaper.',
      'Ikke finn på fakta om ekte bedrifter. Bruk bare det veilederen oppgir.',
    ],
  },
  presets: {
    template: {
      field: 'intervjuer',
      text: {
        titleHint: 'Hvem er intervjueren? For eksempel «Butikksjef».',
        descriptionHint: 'Én setning om hvordan intervjueren er. Vises på kortet.',
        textLabel: 'Beskrivelse av intervjueren',
        textHint:
          'Hvem intervjueren er, hvordan hen oppfører seg og hva hen spør om. Assistenten bruker ' +
          'denne teksten.',
        pickerLead:
          'Malen bestemmer hvem som intervjuer jobbsøkeren. Resten setter du opp i samtalen. ' +
          'Uten mal spør assistenten deg om intervjueren også.',
      },
    },
    jobSeekerProfile: 'jobbsoker',
    industryTemplate: { job: 'stilling', industry: 'bransje' },
  },
  // Safe cast: answers are checked with hasAllAnswers before a prompt is built.
  buildPrompt: (answers) => buildPrompt(answers as Configuration),
  buildSummary: buildInterviewerSummary,
  // The Candidate lists an agent's roles as the interviewers to choose from.
  buildRoles: (name, answers) => [{ name, description: answers.intervjuer }],
  // Only the job title: an industry template puts a whole job description after it, which would
  // go past the name's length limit.
  defaultName: (answers) => `Intervjuer for ${answers.stilling.split('. ')[0]}`,
};
