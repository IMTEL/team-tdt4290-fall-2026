import { LABELS, type Configuration } from '../configuration';
import { explainInterviewer } from '../interviewerAdaptations';
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
      question: 'Hvilken bransje er stillingen i?',
      hint:
        'To spørsmål, ett per melding. Først bransjen: gi ALLTID 3–4 ekte bransjer som passer ' +
        'stillingen, med [ALTERNATIVER: flere], aldri «Annet». Så om arbeidsgiveren er offentlig ' +
        'eller privat, med alternativene «1. Offentlig» og «2. Privat».',
      format: '… (offentlig/privat)',
    },
    {
      key: 'bedrift',
      label: LABELS.bedrift,
      question: 'Hvilken bedrift eller virksomhet skal intervjuet være hos?',
      hint:
        'To spørsmål, ett per melding. Først navnet: uten alternativer, men med [VALGFRITT], så ' +
        'veilederen kan hoppe over det. Så visjon og verdier, og eventuelt nettside som kontekst: ' +
        'et åpent spørsmål uten alternativer. Bedrift-linjen skal alltid være med i blokken; er ' +
        'navnet hoppet over, skriv «ikke oppgitt» for det.',
      format: 'navn | Visjon og verdier: …',
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
      hint:
        'To spørsmål, ett per melding: rollen (for eksempel HR, leder eller kommende kollega), ' +
        'så stilen (vennlig, nøytral eller krevende).',
      format: 'rolle, stil',
    },
    {
      key: 'jobbsoker',
      label: LABELS.jobbsoker,
      question: 'Hvem er jobbsøkeren?',
      hint:
        'Fire spørsmål, ett per melding, uten personopplysninger: aldersgruppe (under 25, 25–39, ' +
        '40+), erfaring, språknivå i norsk, og hva personen trenger å øve på (for eksempel ' +
        'nervøsitet, hull i CV-en, å fortelle om egne styrker; med [ALTERNATIVER: flere]). ' +
        'Oppgir veilederen en alder, skriv bare aldersgruppen den hører til. Erfaring kan være ' +
        'en hvilken som helst tid, også under ett år (for eksempel «1 måned»).',
      format: 'aldersgruppe, erfaring, norsknivå, øvingsmål',
    },
    {
      key: 'vanskelighetsgrad',
      label: LABELS.vanskelighetsgrad,
      question: 'Hvor vanskelig og hvor langt skal intervjuet være?',
      hint:
        'Tre spørsmål, ett per melding: vanskelighetsgraden, antall spørsmål (standard 6–8), og ' +
        'om intervjueren skal stille oppfølgingsspørsmål.',
      format: '… | Antall spørsmål: … | Oppfølgingsspørsmål: ja/nei',
    },
    {
      key: 'egneSporsmal',
      label: LABELS.egneSporsmal,
      question: 'Er det spørsmål som må være med?',
      hint: 'Et åpent spørsmål uten alternativer.',
    },
    {
      key: 'tillegg',
      label: LABELS.tillegg,
      question: 'Er det noe mer du vil legge til?',
      hint:
        'Still det med alternativene «1. Nei, jeg er ferdig» og «2. Ja, jeg vil legge til noe». ' +
        'Vil veilederen legge til noe, be om det, bekreft kort, og still spørsmålet på nytt til ' +
        'veilederen er ferdig. Her havner også det veilederen skriver underveis som ikke hører ' +
        'til et annet punkt.',
      optional: true,
    },
    {
      key: 'lovverk',
      label: LABELS.lovverk,
      // Never asked: the text comes from the legal templates the counsellor chose before the chat.
      question: 'Hvilket lovverk skal intervjueren følge?',
      optional: true,
      presetOnly: true,
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
      'Er lovverk bestemt, ikke foreslå egne spørsmål som bryter det. Ber veilederen om et slikt ' +
        'spørsmål, si kort hvorfor det ikke går, og be om et annet.',
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
    legalTemplates: 'lovverk',
  },
  // Safe cast: answers are checked with hasAllAnswers before a prompt is built.
  buildPrompt: (answers) => buildPrompt(answers as Configuration),
  buildSummary: buildInterviewerSummary,
  // Safe cast: stored answers and the wizard's answers have every field, empty when not given.
  explainAnswers: (answers) => explainInterviewer(answers as Configuration),
  // One role: The Candidate chats with a published agent as its first role.
  buildRoles: (name, answers) => [{ name, description: answers.intervjuer }],
  // Only the job title: an industry template puts a whole job description after it, which would
  // go past the name's length limit.
  defaultName: (answers) => `Intervjuer for ${answers.stilling.split('. ')[0]}`,
};
