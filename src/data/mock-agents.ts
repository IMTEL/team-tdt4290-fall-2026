import type { Agent } from '@/lib/types';

export const mockAgents: Agent[] = [
  {
    id: '1',
    name: 'Kindergarden Interview Coach',
    description:
      'Helps candidates practice for early childhood education roles with friendly, scenario-based interview questions.',
    status: 'published',
    createdAt: '2026-01-15T10:00:00.000Z',
  },
  {
    id: '2',
    name: 'Cashier Interview Trainer',
    description:
      'Simulates retail interview scenarios, focusing on customer service, handling cash, and conflict resolution questions.',
    status: 'draft',
    createdAt: '2026-02-03T09:30:00.000Z',
  },
  {
    id: '3',
    name: 'Data Analyst Interview Trainer',
    description:
      'Prepares candidates for data analyst interviews with technical, SQL, and case-study style questions.',
    status: 'published',
    createdAt: '2026-03-10T14:45:00.000Z',
  },
];
