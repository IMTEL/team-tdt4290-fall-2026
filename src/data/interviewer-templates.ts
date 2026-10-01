export interface InterviewerTemplate {
  id: string;
  /** The interviewer's role, shown on the card. */
  title: string;
  /** One line for the counsellor about what this interviewer is like. */
  description: string;
  /** What the interviewer focuses on, shown as tags on the card. */
  focus: string[];
  /** Sent to the configurator as the starting point. Written as the counsellor would say it. */
  persona: string;
}

export const interviewerTemplates: InterviewerTemplate[] = [
  {
    id: 'daglig-leder',
    title: 'Daglig leder',
    description: 'Leder en mindre bedrift og ansetter selv. Direkte, opptatt av helheten.',
    focus: ['Motivasjon', 'Holdninger', 'Hvorfor oss?'],
    persona:
      'Intervjueren er daglig leder i en mindre bedrift og ansetter selv. Hen er direkte og ' +
      'vennlig, og vil finne ut om kandidaten passer inn i bedriften. Hen spør om motivasjon, ' +
      'holdninger, pålitelighet og hvorfor kandidaten vil jobbe akkurat her.',
  },
  {
    id: 'hr-medarbeider',
    title: 'HR-medarbeider',
    description: 'Følger en fast struktur og stiller atferdsspørsmål. Saklig og grundig.',
    focus: ['Erfaring', 'Samarbeid', 'Konkrete eksempler'],
    persona:
      'Intervjueren jobber i HR og følger en fast intervjumal. Hen er saklig og grundig, og ' +
      'stiller atferdsbaserte spørsmål som «Fortell om en gang du …». Hen spør om erfaring, ' +
      'samarbeid, styrker og svakheter, og ber om konkrete eksempler.',
  },
  {
    id: 'teamleder',
    title: 'Teamleder',
    description: 'Skal jobbe tett med kandidaten til daglig. Praktisk og uformell.',
    focus: ['Arbeidsoppgaver', 'Samarbeid i teamet', 'Situasjoner'],
    persona:
      'Intervjueren er teamleder og blir nærmeste leder for den som ansettes. Hen er uformell ' +
      'og praktisk, og spør om hvordan kandidaten løser vanlige arbeidsoppgaver, samarbeider ' +
      'med kolleger og håndterer travle dager og uenighet.',
  },
  {
    id: 'fagperson',
    title: 'Fagperson',
    description: 'En erfaren kollega som tester fagkunnskap. Nysgjerrig og konkret.',
    focus: ['Fagkunnskap', 'Problemløsning', 'Praktiske oppgaver'],
    persona:
      'Intervjueren er en erfaren fagperson i samme yrke. Hen er nysgjerrig og konkret, og ' +
      'tester fagkunnskap med praktiske spørsmål og små case-oppgaver fra hverdagen i jobben.',
  },
];
