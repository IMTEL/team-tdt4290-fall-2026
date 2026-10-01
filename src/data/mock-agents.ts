import type { Agent } from '@/lib/types';

export const mockAgents: Agent[] = [
  {
    id: '1',
    name: 'Intervjutrener for barnehage',
    description:
      'Hjelper jobbsøkere å øve til stillinger i barnehage med vennlige, scenariobaserte intervjuspørsmål.',
    status: 'published',
    createdAt: '2026-01-15T10:00:00.000Z',
  },
  {
    id: '2',
    name: 'Intervjutrener for kassamedarbeider',
    description:
      'Simulerer intervjuer i butikk, med vekt på kundeservice, kontanthåndtering og konflikthåndtering.',
    status: 'draft',
    createdAt: '2026-02-03T09:30:00.000Z',
  },
  {
    id: '3',
    name: 'Intervjutrener for dataanalytiker',
    description:
      'Forbereder jobbsøkere til intervjuer som dataanalytiker, med tekniske spørsmål, SQL og case-oppgaver.',
    status: 'published',
    createdAt: '2026-03-10T14:45:00.000Z',
  },
];
