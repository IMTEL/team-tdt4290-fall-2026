// The text of the help page. Written for counsellors who are new to the app: short steps that use
// the same words as the buttons. The topics come from what users got stuck on in the user test
// with a NAV counsellor (29.10): the words for the kinds of templates, where the templates are,
// how to go back in the form, and the thumbs under the agent's replies.

import {
  FORM_SECTIONS,
  NEW_AGENT_HELP_ID,
  type FormSectionHelpId,
} from '@/app/configure/formSections';

/** One word the app uses, and what it means. */
export type HelpTerm = { term: string; meaning: string };

/** A part of a topic with its own heading, e.g. one section of the new agent form. */
export type HelpPart = { id: string; title: string; steps: string[] };

export type HelpTopic = {
  /** The anchor, so other pages can link to `/help#<id>`. */
  id: string;
  title: string;
  intro?: string;
  terms?: HelpTerm[];
  steps?: string[];
  parts?: HelpPart[];
  /** A closing tip under the steps. */
  note?: string;
};

/** The steps for each section of the new agent form. A section without steps does not compile. */
const NEW_AGENT_STEPS: Record<FormSectionHelpId, string[]> = {
  stilling: [
    // English translation: Write the position the job seeker will practise for.
    'Skriv stillingen jobbsøkeren skal øve til.',
    // English translation: Choose a job template, or «Ingen mal». The template fills in the
    // industry and employer for you, and you can change them afterwards.
    'Velg en stillingsmal, eller «Ingen mal». Malen fyller inn bransje og arbeidsgiver for deg, og du kan endre dem etterpå.',
    // English translation: Choose the industry, and whether the employer is public or private.
    // Choose «Ikke oppgitt» if it does not matter.
    'Velg bransje, og om arbeidsgiveren er offentlig eller privat. Velg «Ikke oppgitt» hvis det ikke betyr noe.',
    // English translation: The company is optional. Without one, the interviewer uses a general
    // company.
    'Bedrift er valgfritt. Uten bedrift bruker intervjueren en generell bedrift.',
  ],
  intervjuer: [
    // English translation: Choose an interviewer template, or press «Fortsett uten mal».
    'Velg en intervjuermal, eller trykk «Fortsett uten mal».',
    // English translation: Choose the laws the interviewer must follow.
    'Velg lovverket intervjueren skal følge.',
    // English translation: If no template fits, press «Lag en ny mal». You come back here when
    // the template is saved.
    'Finner du ingen mal som passer, trykk «Lag en ny mal». Du kommer tilbake hit når malen er lagret.',
  ],
  jobbsoker: [
    // English translation: Choose a job seeker template, or press «Fortsett uten mal».
    'Velg en jobbsøkermal, eller trykk «Fortsett uten mal».',
    // English translation: Tick what the job seeker wants to practise. Under «Andre» you can
    // write it in your own words.
    'Kryss av for det jobbsøkeren vil øve på. Under «Andre» kan du skrive det med egne ord.',
  ],
  innstillinger: [
    // English translation: Choose the interview type, difficulty and number of questions.
    'Velg intervjutype, vanskelighetsgrad og antall spørsmål.',
    // English translation: Under «Egne spørsmål» you can write questions the interviewer will
    // ask.
    'Under «Egne spørsmål» kan du skrive spørsmål intervjueren skal stille.',
    // English translation: «Avanserte innstillinger» is for those who want to control the
    // language model themselves. You can leave them as they are.
    '«Avanserte innstillinger» er for den som vil styre språkmodellen selv. Du kan la dem stå som de er.',
  ],
  fullfore: [
    // English translation: Look over the summary. «Slik former svarene dine agenten» shows what
    // your choices do.
    'Se over oppsummeringen. «Slik former svarene dine agenten» viser hva valgene dine gjør.',
    // English translation: Give the agent a name and choose an avatar.
    'Gi agenten et navn og velg en avatar.',
    // English translation: Press «Publiser» or «Lagre som utkast». Both save the agent under
    // Agenter, so you find it again on any computer. «Test agenten» saves it and opens the test
    // right away.
    'Trykk «Publiser» eller «Lagre som utkast». Begge lagrer agenten under Agenter, så du finner den igjen på alle maskiner. «Test agenten» lagrer den og åpner testen med en gang.',
    // English translation: The agent is not in The Candidate yet. See «Publiser til The
    // Candidate» below.
    'Agenten er ikke i The Candidate ennå. Se «Publiser til The Candidate» under.',
  ],
};

/** The new agent form's sections, in the form's order, each with its anchor and steps. */
export const NEW_AGENT_PARTS: HelpPart[] = FORM_SECTIONS.map(({ title, helpId }) => ({
  id: helpId,
  title,
  steps: NEW_AGENT_STEPS[helpId],
}));

export const HELP_TOPICS: HelpTopic[] = [
  {
    id: 'ord',
    // English translation: Glossary
    title: 'Ordliste',
    terms: [
      {
        term: 'Agent',
        // English translation: An AI agent the job seeker can talk to. In this app it is an
        // interviewer.
        meaning: 'En KI-agent som jobbsøkeren kan snakke med. I denne appen er dette en intervjuer.',
      },
      {
        // English translation: Template
        term: 'Mal',
        // English translation: Information filled in beforehand that you can choose when you
        // make an agent, so you do not have to write everything yourself. All templates are
        // optional.
        meaning:
          'Ferdig utfylt informasjon du kan velge når du lager en agent, så du slipper å skrive alt selv. Alle maler er valgfrie.',
      },
      {
        // English translation: Job template
        term: 'Stillingsmal',
        // English translation: Fills in position, industry and employer, for example for a shop
        // job.
        meaning: 'Fyller inn stilling, bransje og arbeidsgiver, for eksempel for en butikkjobb.',
      },
      {
        // English translation: Industry template
        term: 'Bransjemal',
        // English translation: Groups positions in the same industry, for example health and
        // care.
        meaning: 'Samler stillinger i samme bransje, for eksempel helse og omsorg.',
      },
      {
        // English translation: Interviewer template
        term: 'Intervjuermal',
        // English translation: Decides who interviews: how they behave, and what they ask the
        // job seeker about.
        meaning:
          'Bestemmer hvem som intervjuer: hvordan hen oppfører seg, og hva hen spør jobbsøkeren om.',
      },
      {
        // English translation: Job seeker template
        term: 'Jobbsøkermal',
        // English translation: Describes the job seeker who will practise, for example age,
        // education and experience. It is not shown in The Candidate.
        meaning:
          'Beskriver jobbsøkeren som skal øve, for eksempel alder, utdanning og erfaring. Den vises ikke i The Candidate.',
      },
      {
        // English translation: Laws
        term: 'Lovverk',
        // English translation: Laws and rules the interviewer must follow, for example what they
        // may not ask about.
        meaning:
          'Lover og regler intervjueren skal følge, for eksempel hva hen ikke får spørre om.',
      },
      {
        // English translation: Draft
        term: 'Utkast',
        // English translation: An agent you have not finished setting up. On the «Ny
        // intervjuagent» page, the «Lagre utkast» button under «Seksjoner» saves the form as it is.
        // It is only saved in the browser you are using, and shows as a card marked «Utkast» on
        // the Agenter page. Press the card to continue where you left off. The «Lagre som utkast»
        // button on the last step, «Fullføre», is something else: it saves the finished agent on
        // the Agenter page, and you find it again on any computer.
        meaning:
          'En agent du ikke er ferdig med å sette opp. På siden «Ny intervjuagent» lagrer knappen «Lagre utkast» under «Seksjoner» skjemaet slik det er. Det lagres bare i nettleseren du bruker, og vises som et kort merket «Utkast» på siden Agenter. Trykk på kortet for å fortsette der du slapp. Knappen «Lagre som utkast» på siste steg, «Fullføre», er noe annet: den lagrer den ferdige agenten på siden Agenter, og du finner den igjen på alle maskiner.',
      },
      {
        term: 'The Candidate',
        // English translation: The VR app where the job seeker practises the interview with the
        // agent.
        meaning: 'VR-appen der jobbsøkeren øver på intervjuet med agenten.',
      },
    ],
  },
  {
    id: NEW_AGENT_HELP_ID,
    // English translation: Make an agent
    title: 'Lag en agent',
    // English translation: Press «Ny agent» on the start page or under Agenter. The form has
    // five parts. The list beside it shows where you are, and you can press parts you have
    // already been to in order to go back. «Tilbake» takes you to the previous part.
    intro:
      'Trykk «Ny agent» på forsiden eller under Agenter. Skjemaet har fem deler. Listen ved siden av viser hvor du er, og du kan trykke på deler du allerede har vært i for å gå tilbake. «Tilbake» tar deg til forrige del.',
    parts: NEW_AGENT_PARTS,
    // English translation: Want to take a break? Press «Lagre utkast». The form is saved in this
    // browser, and you find it as a draft under Agenter.
    note: 'Vil du ta en pause? Trykk «Lagre utkast». Skjemaet blir lagret i denne nettleseren, og du finner det som et utkast under Agenter.',
  },
  {
    id: 'maler',
    // English translation: Templates
    title: 'Maler',
    steps: [
      // English translation: Press «Maler» at the top of the page.
      'Trykk «Maler» øverst på siden.',
      // English translation: The templates are split into industry, job seeker, job and
      // interviewer templates, and laws. Press a group to open or close it.
      'Malene er delt i bransjemaler, jobbsøkermaler, stillingsmaler, intervjuermaler og lovverk. Trykk på en gruppe for å åpne eller lukke den.',
      // English translation: Press a template to see it, or the first card in the group
      // («Ny bransjemal», «Nytt lovverk» and so on) to make a new one.
      'Trykk på en mal for å se den, eller på det første kortet i gruppen («Ny bransjemal», «Nytt lovverk» og så videre) for å lage en ny.',
      // English translation: In an interviewer template, «Kort beskrivelse» is one sentence
      // shown on the card. «Fokusområder» are keywords separated by commas, for example
      // «Service, Samarbeid».
      'I en intervjuermal er «Kort beskrivelse» én setning som vises på kortet. «Fokusområder» er stikkord skilt med komma, for eksempel «Service, Samarbeid».',
      // English translation: «Beskrivelse av intervjueren» is the most important field: who the
      // interviewer is, how they behave and what they ask about.
      '«Beskrivelse av intervjueren» er det viktigste feltet: hvem intervjueren er, hvordan hen oppfører seg og hva hen spør om.',
    ],
  },
  {
    id: 'test',
    // English translation: Test the agent
    title: 'Test agenten',
    steps: [
      // English translation: Open the agent under Agenter and press «Test agenten».
      'Åpne agenten under Agenter og trykk «Test agenten».',
      // English translation: Talk to the agent as a job seeker would. Write your answer and send
      // it.
      'Snakk med agenten slik en jobbsøker ville gjort. Skriv svaret ditt og send det.',
      // English translation: Under each reply from the agent there is a thumbs up and a thumbs
      // down. Press one of them and preferably write why. The agent takes your ratings into
      // account when it answers later.
      'Under hvert svar fra agenten er det en tommel opp og en tommel ned. Trykk på en av dem og skriv gjerne hvorfor. Agenten tar hensyn til vurderingene dine når den svarer senere.',
      // English translation: When the interview is done, press «Be om tilbakemelding». An
      // observer reads the interview and tells what went well and what can be better.
      'Når intervjuet er ferdig, trykk «Be om tilbakemelding». En observatør leser intervjuet og forteller hva som gikk bra og hva som kan bli bedre.',
      // English translation: «Start på nytt» deletes the conversation and starts a new one.
      '«Start på nytt» sletter samtalen og begynner en ny.',
    ],
  },
  {
    id: 'publiser',
    // English translation: Publish to The Candidate
    title: 'Publiser til The Candidate',
    steps: [
      // English translation: Open the agent under Agenter and press «Publiser».
      'Åpne agenten under Agenter og trykk «Publiser».',
      // English translation: Write the name and a short description the job seeker will see in
      // The Candidate. Do not write anything about the job seeker here.
      'Skriv navnet og en kort beskrivelse som jobbsøkeren skal se i The Candidate. Ikke skriv noe om jobbsøkeren her.',
      // English translation: Press «Publiser». Now everyone who uses The Candidate can choose
      // the agent.
      'Trykk «Publiser». Nå kan alle som bruker The Candidate velge agenten.',
      // English translation: To remove it from The Candidate, press «Gjem agent».
      'Vil du fjerne den fra The Candidate, trykk «Gjem agent».',
    ],
    // English translation: If you change a published agent, it is hidden from The Candidate
    // until you publish it again.
    note: 'Endrer du en publisert agent, blir den gjemt fra The Candidate til du publiserer den på nytt.',
  },
  {
    id: 'endre',
    // English translation: Edit, clone or delete an agent
    title: 'Endre, klone eller slette en agent',
    steps: [
      // English translation: Find the agent under Agenter. The search field at the top helps
      // you find it.
      'Finn agenten under Agenter. Søkefeltet øverst hjelper deg å finne den.',
      // English translation: «Rediger» lets you change the answers you gave when you made the
      // agent.
      '«Rediger» lar deg endre svarene du ga da du laget agenten.',
      // English translation: «Klon» makes a copy you can change. The first agent stays as it
      // is.
      '«Klon» lager en kopi du kan endre. Den første agenten blir som den er.',
      // English translation: «Slett» removes the agent for good. It cannot be undone.
      '«Slett» fjerner agenten for godt. Det kan ikke angres.',
    ],
  },
];
