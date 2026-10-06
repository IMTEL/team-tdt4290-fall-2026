// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { interviewer } from '@/domain/agentTypes/interviewer';
import { readStoredAnswers } from '@/domain/agentTypes/storedAnswers';
import { applyEdit, toRagdollAgent } from './agentMapper';
import type { FullRagdollAgent } from './ragdoll';

const answers = {
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
  const agent = toRagdollAgent('Butikksjef Kari', interviewer, answers, 'idun-key', now);

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

  it('builds the prompt from the answers', () => {
    expect(agent.prompt).toContain('Stilling: Butikkmedarbeider');
  });

  it('stores the answers so they can be read back later', () => {
    expect(readStoredAnswers(agent.description)).toEqual({ definition: interviewer, answers });
  });

  it('uses the IDUN key for both the LLM and the embeddings', () => {
    expect(agent.llm_api_key).toBe('idun-key');
    expect(agent.embedding_api_key).toBe('idun-key');
  });

  it('stamps the time it was built', () => {
    expect(agent.last_updated).toBe('2026-10-01T08:00:00.000Z');
  });
});

describe('applyEdit', () => {
  const existing: FullRagdollAgent = {
    ...toRagdollAgent('Gammelt navn', interviewer, answers, 'idun-key'),
    id: 'agent-1',
    // Fields we never set ourselves, which must survive the edit.
    access_key: ['vr-key'],
    llm_temperature: 0.2,
  };
  const now = new Date('2026-10-06T12:00:00.000Z');
  const newAnswers = { ...answers, vanskelighetsgrad: 'vanskelig' };
  const edited = applyEdit(existing, 'Nytt navn', interviewer, newAnswers, now);

  it('changes the name, the role, the prompt and the stored answers', () => {
    expect(edited.name).toBe('Nytt navn');
    expect(edited.roles[0].name).toBe('Nytt navn');
    expect(edited.prompt).toContain('vanskelig');
    expect(readStoredAnswers(edited.description)?.answers).toEqual(newAnswers);
    expect(edited.last_updated).toBe('2026-10-06T12:00:00.000Z');
  });

  it('keeps the id, so RAGdoll updates the agent instead of making a new one', () => {
    expect(edited.id).toBe('agent-1');
  });

  it('keeps every field the edit does not touch', () => {
    expect(edited.access_key).toEqual(['vr-key']);
    expect(edited.llm_temperature).toBe(0.2);
    expect(edited.context_aware_retrieval).toBe(false);
    expect(edited.llm_api_key).toBe('idun-key');
  });
});
