import { cleanAnswer, lowerFirst } from './answerText';
import { LABELS, type Configuration } from './configuration';
import { difficultyLevel, followUpOf, questionCountOf } from './difficulty';
import { PRACTICE_CHOICES } from './jobSeekerProfile';

/**
 * One way an answer changes the interviewer. `instruction` is the line it adds to the prompt, and
 * `effect` says the same to the counsellor in plain Norwegian. Both come from the same rule, so the
 * counsellor is never told about a change the prompt does not make. `instruction` is null when the
 * prompt has a section of its own for it, as the legal templates do.
 */
export type Adaptation = {
  key: keyof Configuration;
  instruction: string | null;
  effect: string;
};

/** How the answers change the interviewer, in the order of the fields. */
export function interviewerAdaptations(c: Configuration): Adaptation[] {
  return [
    ...position(c),
    ...industry(c),
    ...company(c),
    ...interviewType(c),
    ...interviewerRole(c),
    ...jobSeeker(c),
    ...difficulty(c),
    ...ownQuestions(c),
    ...additions(c),
    ...legalFrameworks(c),
  ];
}

/** The effects grouped by answer, with the answer's label, in the order of the fields. */
export function explainInterviewer(
  c: Configuration,
): { key: keyof Configuration; label: string; effects: string[] }[] {
  const adaptations = interviewerAdaptations(c);
  return (Object.keys(LABELS) as (keyof Configuration)[])
    .map((key) => ({
      key,
      label: LABELS[key],
      effects: adaptations.filter((a) => a.key === key).map((a) => a.effect),
    }))
    .filter((group) => group.effects.length > 0);
}

function position(c: Configuration): Adaptation[] {
  // A stillingsmal puts the job description after the title.
  const [title, ...description] = c.stilling.trim().split('. ');
  if (!cleanAnswer(title)) return [];

  return [
    {
      key: 'stilling',
      instruction:
        'Knytt spørsmålene til stillingen og det jobbsøkeren allerede har fortalt, slik en ekte intervjuer ville gjort.',
      effect:
        description.length > 0
          ? `Spørsmålene handler om stillingen ${lowerFirst(cleanAnswer(title))} og beskrivelsen fra stillingsmalen.`
          : `Spørsmålene handler om stillingen ${lowerFirst(cleanAnswer(title))}.`,
    },
  ];
}

function industry(c: Configuration): Adaptation[] {
  // Saved as «Varehandel (privat)», or «Ingen bransje (…)» when the wizard had none. A bransjemal
  // adds «| Om bransjen: …».
  const [line, ...rest] = c.bransje.split('|');
  const name = cleanAnswer(line.replace(/\s*\([^)]*\)\s*$/, ''));
  if (!name || /^ingen bransje$/i.test(name)) return [];
  const about = cleanAnswer(rest.join('|').replace(/^\s*Om bransjen:\s*/i, ''));

  return [
    {
      key: 'bransje',
      instruction: about
        ? `Still spørsmål som passer for bransjen (${name}), og bruk det som står om bransjen i konfigurasjonen.`
        : `Still spørsmål som passer for bransjen (${name}), om det som er vanlig å gjøre og kunne der.`,
      effect: about
        ? `Spørsmålene er tilpasset bransjen ${lowerFirst(name)} og det bransjemalen sier om den.`
        : `Spørsmålene er tilpasset bransjen ${lowerFirst(name)}.`,
    },
  ];
}

function company(c: Configuration): Adaptation[] {
  // Agents set up in the old configuration chat have «navn | Visjon og verdier: …»; the wizard
  // writes only the name.
  const [nameAnswer, ...rest] = c.bedrift.split('|');
  const name = cleanAnswer(nameAnswer);
  const values = cleanAnswer(rest.join('|').replace(/^\s*Visjon og verdier:\s*/i, ''));

  const adaptations: Adaptation[] = [
    name
      ? {
          key: 'bedrift',
          instruction: `Du intervjuer på vegne av ${name}. Ikke finn på fakta om bedriften; bruk bare det som står i konfigurasjonen.`,
          effect: `Intervjueren snakker på vegne av ${name}, og bruker bare det du har skrevet om bedriften.`,
        }
      : {
          key: 'bedrift',
          instruction:
            'Ingen bedrift er oppgitt. Ikke finn på et navn på bedriften; snakk om «oss» eller «arbeidsplassen».',
          effect: 'Ingen bedrift er oppgitt, så intervjueren finner ikke på et bedriftsnavn.',
        },
  ];
  if (values) {
    adaptations.push({
      key: 'bedrift',
      instruction:
        'Still minst ett spørsmål om hvorfor jobbsøkeren passer til bedriftens visjon og verdier.',
      effect: 'Intervjueren spør hvordan jobbsøkeren passer til visjonen og verdiene.',
    });
  }
  return adaptations;
}

function interviewType(c: Configuration): Adaptation[] {
  const type = c.intervjutype.toLowerCase();
  if (type.includes('første')) {
    return [
      {
        key: 'intervjutype',
        instruction:
          'Dette er et første intervju: hold det kort og bli-kjent, og velg spørsmål fra spørsmålsbanken.',
        effect: 'Et kort bli-kjent-intervju, med spørsmål fra spørsmålsbanken.',
      },
    ];
  }
  if (type.includes('andre')) {
    return [
      {
        key: 'intervjutype',
        instruction:
          'Dette er et andre intervju: gå mer i dybden, med faglige spørsmål og konkrete situasjoner fra stillingen. Bruk spørsmålsbanken bare som et utgangspunkt.',
        effect: 'Et mer faglig intervju som går i dybden, med situasjoner fra stillingen.',
      },
    ];
  }
  return [];
}

function interviewerRole(c: Configuration): Adaptation[] {
  const role = cleanAnswer(c.intervjuer);
  if (!role || /^ingen mal$/i.test(role)) {
    return [
      {
        key: 'intervjuer',
        instruction:
          'Ingen intervjuerrolle er valgt. Vær en nøytral og profesjonell intervjuer fra arbeidsgiveren.',
        effect: 'Ingen mal er valgt, så intervjueren er nøytral og profesjonell.',
      },
    ];
  }
  return [
    {
      key: 'intervjuer',
      instruction:
        'Ha rollen og stilen som står under «Intervjuer» i konfigurasjonen, hele intervjuet.',
      effect: 'Intervjueren har rollen og stilen du beskrev, hele intervjuet.',
    },
  ];
}

/** What the interviewer does for each practice area the wizard offers, by the area's id. */
const PRACTICE: Record<(typeof PRACTICE_CHOICES)[number]['id'], Omit<Adaptation, 'key'>> = {
  'Mestre nervøsitet': {
    instruction:
      'Jobbsøkeren vil mestre nervøsitet: hold et rolig tempo, og vær vennlig og oppmuntrende.',
    effect:
      'Intervjueren holder et rolig tempo og er oppmuntrende, så jobbsøkeren kan øve på nervøsitet.',
  },
  'Fortelle om seg selv': {
    instruction:
      'Jobbsøkeren vil øve på å fortelle om seg selv: spør om bakgrunn og interesser, og gi god tid til svarene.',
    effect: 'Intervjueren spør om bakgrunn og interesser, og gir god tid til å fortelle.',
  },
  'Gi konkrete svar med eksempler': {
    instruction:
      'Jobbsøkeren vil gi konkrete svar: still spørsmål som ber om eksempler, som «Fortell om en gang du …».',
    effect: 'Intervjueren stiller spørsmål som ber om konkrete eksempler.',
  },
  'Snakke om egne styrker og svakheter': {
    instruction: 'Still minst ett spørsmål om jobbsøkerens styrker og ett om svakheter.',
    effect: 'Intervjueren spør om både styrker og svakheter.',
  },
  'Forklare hull i CV-en': {
    instruction:
      'Spør på en respektfull måte om perioder uten jobb eller skole, så jobbsøkeren kan øve på å forklare dem.',
    effect: 'Intervjueren spør respektfullt om hull i CV-en.',
  },
  'Snakke norsk i intervju': {
    instruction:
      'Jobbsøkeren øver på norsk: bruk et enkelt og tydelig språk med korte setninger, og gi tid til å svare.',
    effect: 'Intervjueren bruker enkelt og tydelig norsk, og gir tid til å svare.',
  },
  'Stille spørsmål til arbeidsgiveren': {
    instruction:
      'Gi jobbsøkeren god tid til egne spørsmål på slutten. Svar kort, og bare ut fra konfigurasjonen.',
    effect: 'Intervjueren gir god tid til jobbsøkerens egne spørsmål på slutten.',
  },
};

function jobSeeker(c: Configuration): Adaptation[] {
  const text = cleanAnswer(c.jobbsoker);
  if (!text) return [];

  // The wizard writes «…; vil øve på: mestre nervøsitet, forklare hull i cv-en».
  const listed = text.match(/vil øve på:\s*([^;]+)/i)?.[1];
  if (!listed) {
    // Agents made in the configuration chat describe the job seeker in their own words.
    return [
      {
        key: 'jobbsoker',
        instruction:
          'Tilpass intervjuet til jobbsøkeren og det hen vil øve på. Vil hen for eksempel mestre nervøsitet, hold et rolig tempo og vær oppmuntrende.',
        effect: 'Intervjueren tilpasser seg det som står om jobbsøkeren og det hen vil øve på.',
      },
    ];
  }

  const areas = listed
    .split(',')
    .map((area) => area.trim())
    .filter(Boolean);
  const own: string[] = [];
  const adaptations: Adaptation[] = [];
  for (const area of areas) {
    const choice = PRACTICE_CHOICES.find(({ id }) => id.toLowerCase() === area.toLowerCase());
    if (choice) adaptations.push({ key: 'jobbsoker', ...PRACTICE[choice.id] });
    else own.push(area);
  }
  if (own.length > 0) {
    adaptations.push({
      key: 'jobbsoker',
      instruction: `Jobbsøkeren vil også øve på: ${own.join(', ')}. Tilpass spørsmålene til det.`,
      effect: `Intervjueren tilpasser spørsmålene til det jobbsøkeren vil øve på: ${own.join(', ')}.`,
    });
  }
  return adaptations;
}

/** What each level means, by the level as the wizard and the configuration chat write it. */
const LEVELS: { pattern: RegExp; instruction: string; effect: string }[] = [
  {
    pattern: /^lett/i,
    instruction:
      'Vanskelighetsgraden er lett: still enkle og åpne spørsmål, og vær tålmodig og oppmuntrende.',
    effect: 'Enkle og åpne spørsmål, og en tålmodig intervjuer.',
  },
  {
    pattern: /^middels/i,
    instruction:
      'Vanskelighetsgraden er middels: still vanlige intervjuspørsmål, som i et ekte intervju.',
    effect: 'Vanlige intervjuspørsmål, som i et ekte intervju.',
  },
  {
    pattern: /^(krevende|vanskelig)/i,
    instruction:
      'Vanskelighetsgraden er krevende: still mer utfordrende spørsmål og be om begrunnelser, men vær alltid høflig.',
    effect: 'Mer utfordrende spørsmål, og intervjueren ber om begrunnelser.',
  },
];

function difficulty(c: Configuration): Adaptation[] {
  const adaptations: Adaptation[] = [];

  const level = LEVELS.find(({ pattern }) => pattern.test(difficultyLevel(c.vanskelighetsgrad)));
  if (level) {
    adaptations.push({
      key: 'vanskelighetsgrad',
      instruction: level.instruction,
      effect: level.effect,
    });
  }

  const count = questionCountOf(c.vanskelighetsgrad);
  if (count) {
    adaptations.push({
      key: 'vanskelighetsgrad',
      instruction: `Still ${count} spørsmål i alt. Oppfølgingsspørsmål teller ikke.`,
      effect: `${count} spørsmål i alt, uten oppfølgingsspørsmålene.`,
    });
  }

  // Agents saved before the wizard asked about follow-up questions may ask one.
  if (followUpOf(c.vanskelighetsgrad) === 'nei') {
    adaptations.push({
      key: 'vanskelighetsgrad',
      instruction:
        'Ikke still oppfølgingsspørsmål. Gå videre til neste spørsmål, også når et svar er kort.',
      effect: 'Ingen oppfølgingsspørsmål: intervjueren går rett videre etter hvert svar.',
    });
  } else {
    adaptations.push({
      key: 'vanskelighetsgrad',
      instruction:
        'Hvis et svar er kort eller vagt, kan du stille ett kort oppfølgingsspørsmål før du går videre. Ikke still mer enn ett oppfølgingsspørsmål på samme tema.',
      effect: 'Er et svar kort eller vagt, kan intervjueren stille ett oppfølgingsspørsmål.',
    });
  }
  return adaptations;
}

function ownQuestions(c: Configuration): Adaptation[] {
  if (!cleanAnswer(c.egneSporsmal)) return [];
  return [
    {
      key: 'egneSporsmal',
      instruction:
        'Still spørsmålene under «Egne spørsmål» i konfigurasjonen i løpet av intervjuet. De teller med i antall spørsmål.',
      effect: 'Intervjueren stiller spørsmålene du skrev, og de teller med i antallet.',
    },
  ];
}

function additions(c: Configuration): Adaptation[] {
  if (!c.tillegg?.trim()) return [];
  return [
    {
      key: 'tillegg',
      instruction: 'Følg det veilederen har skrevet under «Tillegg» i konfigurasjonen.',
      effect: 'Intervjueren følger det du la til.',
    },
  ];
}

function legalFrameworks(c: Configuration): Adaptation[] {
  if (!c.lovverk?.trim()) return [];
  return [
    {
      key: 'lovverk',
      // The prompt has a section of its own for the legal templates.
      instruction: null,
      effect:
        'Intervjueren stiller aldri spørsmål lovverket forbyr, og svarer kort på spørsmål om jobbsøkerens rettigheter.',
    },
  ];
}
