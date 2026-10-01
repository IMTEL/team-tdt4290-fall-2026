// @vitest-environment node
import { describe, expect, it } from 'vitest';

import type { Configuration } from '@/domain/configuration';
import { toRagdollAgent } from './agentMapper';

const configuration: Configuration = {
  stilling: 'Butikkmedarbeider',
  bransje: 'Varehandel (privat)',
  bedrift: 'Nærbutikken AS',
  intervjutype: 'første intervju',
  intervjuer: 'butikksjef, vennlig',
  jobbsoker: 'under 25, lite erfaring',
  vanskelighetsgrad: 'lett | Antall spørsmål: 6 | Oppfølgingsspørsmål: ja',
  egneSporsmal: 'ingen',
};

describe('toRagdollAgent', () => {
  const now = new Date('2026-10-01T08:00:00.000Z');
  const agent = toRagdollAgent('Butikksjef Kari', configuration, 'idun-key', now);

  it('uses the counsellor-chosen name for the agent and its one role', () => {
    expect(agent.name).toBe('Butikksjef Kari');
    expect(agent.roles).toEqual([
      {
        name: 'Butikksjef Kari',
        description: 'butikksjef, vennlig',
        document_access: [],
        function_access: [],
      },
    ]);
  });

  it('builds the prompt from the configuration', () => {
    expect(agent.prompt).toContain('Stilling: Butikkmedarbeider');
  });

  it('stores the configuration so it can be read back later', () => {
    expect(JSON.parse(agent.description)).toEqual(configuration);
  });

  it('uses the IDUN key for both the LLM and the embeddings', () => {
    expect(agent.llm_api_key).toBe('idun-key');
    expect(agent.embedding_api_key).toBe('idun-key');
  });

  it('stamps the time it was built', () => {
    expect(agent.last_updated).toBe('2026-10-01T08:00:00.000Z');
  });
});
