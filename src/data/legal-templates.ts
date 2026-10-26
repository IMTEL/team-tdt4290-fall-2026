import type { LegalTemplate } from '@/domain/legalTemplate';

// The legal templates that come with the app. A summary in plain words, not legal advice: the
// counsellors' own templates can say more, or say it for their job seekers.
// TODO: have the customer check the wording against the laws before release.
export const builtInLegalTemplates: LegalTemplate[] = [
  {
    id: 'builtin-legal-hiring-rights',
    builtIn: true,
    title: 'Rettigheter i ansettelsesprosessen',
    description:
      'Hva en arbeidsgiver ikke kan spørre om i et jobbintervju, etter diskrimineringsloven og ' +
      'arbeidsmiljøloven.',
    text: [
      'Likestillings- og diskrimineringsloven § 30: Arbeidsgiveren kan ikke spørre om ' +
        'graviditet, adopsjon, planer om å få barn, religion eller livssyn, etnisitet, ' +
        'funksjonsnedsettelse, seksuell orientering, kjønnsidentitet eller kjønnsuttrykk. ' +
        'Unntakene er få, for eksempel livssyn i en stilling i et trossamfunn.',
      'Arbeidsmiljøloven § 9-3: Arbeidsgiveren kan ikke be om helseopplysninger, utover det ' +
        'som trengs for å gjøre de oppgavene som hører til stillingen.',
      'Arbeidsmiljøloven § 13-1 og § 13-4: Arbeidsgiveren kan ikke legge vekt på alder, ' +
        'politisk syn eller medlemskap i fagforening, og kan ikke spørre om politisk syn eller ' +
        'fagforening.',
      'Jobbsøkeren har rett til å la være å svare på slike spørsmål, uten at det skal telle mot ' +
        'hen.',
    ].join('\n'),
  },
];

/** The built-in legal template with this id, or undefined if there is none. */
export function findBuiltInLegalTemplate(id: string): LegalTemplate | undefined {
  return builtInLegalTemplates.find((template) => template.id === id);
}
