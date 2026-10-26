// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { DEFAULT_ADVANCED_SETTINGS, DEFAULT_MODEL } from '@/domain/advancedSettings';
import { interviewer } from '@/domain/agentTypes/interviewer';
import { readStoredAnswers, toStoredDescription } from '@/domain/agentTypes/storedAnswers';
import {
  applyEdit,
  currentAvatar,
  currentSettings,
  toAgentListItem,
  toRagdollAgent,
} from './agentMapper';
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
  tillegg: '',
  lovverk: '',
};

describe('toRagdollAgent', () => {
  const now = new Date('2026-10-01T08:00:00.000Z');
  const agent = toRagdollAgent(
    'Butikksjef Kari',
    interviewer,
    answers,
    'idun-key',
    {},
    DEFAULT_ADVANCED_SETTINGS,
    now,
  );

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
    expect(readStoredAnswers(agent.description)).toEqual({
      definition: interviewer,
      answers,
      sources: {},
      customPrompt: false,
      avatar: null,
    });
  });

  it('stores where answers came from', () => {
    const sources = { jobbsoker: { kind: 'profile' as const, id: 'profile-1' } };
    const withSources = toRagdollAgent('Kari', interviewer, answers, 'idun-key', sources);

    expect(readStoredAnswers(withSources.description)?.sources).toEqual(sources);
  });

  it('uses the IDUN key for both the LLM and the embeddings', () => {
    expect(agent.llm_api_key).toBe('idun-key');
    expect(agent.embedding_api_key).toBe('idun-key');
  });

  it('stamps the time it was built', () => {
    expect(agent.last_updated).toBe('2026-10-01T08:00:00.000Z');
  });

  it('uses the default model and temperature without advanced settings', () => {
    expect(agent.llm_model).toBe(DEFAULT_MODEL);
    expect(agent.llm_temperature).toBe(0.7);
  });

  it('uses the chosen model, temperature and hand-written prompt', () => {
    const custom = toRagdollAgent(
      'Kari',
      interviewer,
      answers,
      'idun-key',
      {},
      {
        model: 'meta/llama-3.3-70b',
        temperature: 0.2,
        customPrompt: 'Du er Kari.',
      },
    );

    expect(custom.llm_model).toBe('meta/llama-3.3-70b');
    expect(custom.llm_temperature).toBe(0.2);
    expect(custom.prompt).toBe('Du er Kari.');
    expect(readStoredAnswers(custom.description)?.customPrompt).toBe(true);
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
  const edited = applyEdit(existing, 'Nytt navn', interviewer, newAnswers, {}, undefined, now);

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

describe('applyEdit with advanced settings', () => {
  const newAnswers = { ...answers, vanskelighetsgrad: 'vanskelig' };
  const handWritten = {
    ...toRagdollAgent(
      'Kari',
      interviewer,
      answers,
      'idun-key',
      {},
      {
        model: 'meta/llama-3.3-70b',
        temperature: 0.2,
        customPrompt: 'Du er Kari.',
      },
    ),
    id: 'agent-1',
  };

  it('keeps a hand-written prompt, model and temperature when only the answers change', () => {
    const edited = applyEdit(handWritten, 'Kari', interviewer, newAnswers);

    expect(edited.prompt).toBe('Du er Kari.');
    expect(edited.llm_model).toBe('meta/llama-3.3-70b');
    expect(edited.llm_temperature).toBe(0.2);
    expect(readStoredAnswers(edited.description)?.customPrompt).toBe(true);
  });

  it('builds the prompt from the answers again when the hand-written one is dropped', () => {
    const edited = applyEdit(
      handWritten,
      'Kari',
      interviewer,
      newAnswers,
      {},
      {
        model: 'meta/llama-3.3-70b',
        temperature: 0.2,
        customPrompt: null,
      },
    );

    expect(edited.prompt).toContain('vanskelig');
    expect(readStoredAnswers(edited.description)?.customPrompt).toBe(false);
  });

  it('saves new settings', () => {
    const edited = applyEdit(
      handWritten,
      'Kari',
      interviewer,
      answers,
      {},
      {
        model: DEFAULT_MODEL,
        temperature: 1.1,
        customPrompt: 'Du er Kari, men strengere.',
      },
    );

    expect(edited.llm_model).toBe(DEFAULT_MODEL);
    expect(edited.llm_temperature).toBe(1.1);
    expect(edited.prompt).toBe('Du er Kari, men strengere.');
  });
});

describe('currentSettings', () => {
  it('reads the settings of an agent with a hand-written prompt', () => {
    const agent = {
      ...toRagdollAgent(
        'Kari',
        interviewer,
        answers,
        'idun-key',
        {},
        {
          model: 'meta/llama-3.3-70b',
          temperature: 0.2,
          customPrompt: 'Du er Kari.',
        },
      ),
      id: 'agent-1',
    };

    expect(currentSettings(agent)).toEqual({
      model: 'meta/llama-3.3-70b',
      temperature: 0.2,
      customPrompt: 'Du er Kari.',
    });
  });

  it('gives null as the prompt when it was built from the answers', () => {
    const agent = { ...toRagdollAgent('Kari', interviewer, answers, 'idun-key'), id: 'agent-1' };

    expect(currentSettings(agent).customPrompt).toBeNull();
  });

  it('gives the default temperature to an agent RAGdoll returns without one', () => {
    const agent = { ...toRagdollAgent('Kari', interviewer, answers, 'idun-key'), id: 'agent-1' };
    delete (agent as Record<string, unknown>).llm_temperature;

    expect(currentSettings(agent).temperature).toBe(0.7);
  });
});

describe('toAgentListItem', () => {
  const summary = {
    id: 'a1',
    name: 'Kari',
    description: '',
    lastUpdated: '2026-10-01',
    llmModel: DEFAULT_MODEL,
    temperature: 0.7,
    prompt: 'Du er Kari.',
  };

  it('adds the type and the answers the cards use, and keeps the description', () => {
    const description = toStoredDescription(interviewer, answers);
    const item = toAgentListItem({ ...summary, description });

    expect(item).toEqual({
      ...summary,
      description,
      avatar: null,
      type: 'interviewer',
      typeLabel: 'Intervjuer',
      stilling: 'Butikkmedarbeider',
      bransje: 'Varehandel (privat)',
      vanskelighetsgrad: 'lett | Antall spørsmål: 6 | Oppfølgingsspørsmål: ja',
      intervjuer: 'butikksjef, vennlig',
      intervjutype: 'første intervju',
      intervjuerMal: null,
    });
  });

  it('names the interviewer template when the answer came from one', () => {
    const description = toStoredDescription(
      interviewer,
      { ...answers, intervjuer: 'Intervjueren er daglig leder i en mindre bedrift.' },
      { intervjuer: { kind: 'template', id: 'daglig-leder' } },
    );

    const item = toAgentListItem({ ...summary, description });

    expect(item.intervjuerMal).toBe('Daglig leder');
  });

  it('gives the avatar, or null for the default image', () => {
    const withAvatar = toStoredDescription(interviewer, answers, {}, { avatar: 'katt' });

    expect(toAgentListItem({ ...summary, description: withAvatar }).avatar).toBe('katt');
    expect(toAgentListItem(summary).avatar).toBeNull();
  });

  it('reads agents saved before agent types existed as interviewers', () => {
    const item = toAgentListItem({ ...summary, description: JSON.stringify(answers) });

    expect(item.type).toBe('interviewer');
    expect(item.typeLabel).toBe('Intervjuer');
    expect(item.stilling).toBe('Butikkmedarbeider');
  });

  it('gives null for an empty answer, not an empty text', () => {
    const description = toStoredDescription(interviewer, { ...answers, bransje: '' });

    expect(toAgentListItem({ ...summary, description }).bransje).toBeNull();
  });

  it('gives null for every added field when the description is not ours', () => {
    const item = toAgentListItem({ ...summary, description: 'Laget i RAGdoll' });

    expect(item).toEqual({
      ...summary,
      description: 'Laget i RAGdoll',
      avatar: null,
      type: null,
      typeLabel: null,
      stilling: null,
      bransje: null,
      vanskelighetsgrad: null,
      intervjuer: null,
      intervjutype: null,
      intervjuerMal: null,
    });
  });
});

describe('the avatar', () => {
  const NOW = new Date('2026-10-06T12:00:00.000Z');
  const withAvatar = (avatar: string | null) => ({
    ...toRagdollAgent('Kari', interviewer, answers, 'idun-key', {}, undefined, NOW, avatar),
    id: 'agent-1',
  });

  it('is saved with a new agent, and a new agent has none unless one is chosen', () => {
    expect(currentAvatar(withAvatar('ugle'))).toBe('ugle');
    expect(currentAvatar(withAvatar(null))).toBeNull();
  });

  it('is kept when an edit does not send one', () => {
    const edited = applyEdit(withAvatar('ugle'), 'Nytt navn', interviewer, answers);

    expect(currentAvatar(edited)).toBe('ugle');
  });

  it('is changed by an edit that sends one', () => {
    const edited = applyEdit(
      withAvatar('ugle'),
      'Kari',
      interviewer,
      answers,
      {},
      undefined,
      NOW,
      'rev',
    );

    expect(currentAvatar(edited)).toBe('rev');
  });

  it('goes back to the default image when an edit sends null', () => {
    const edited = applyEdit(
      withAvatar('ugle'),
      'Kari',
      interviewer,
      answers,
      {},
      undefined,
      NOW,
      null,
    );

    expect(currentAvatar(edited)).toBeNull();
    expect(JSON.parse(edited.description)).not.toHaveProperty('avatar');
  });

  it('is kept next to a hand-written prompt', () => {
    const settings = { ...DEFAULT_ADVANCED_SETTINGS, customPrompt: 'Du er Kari.' };
    const edited = applyEdit(withAvatar('sol'), 'Kari', interviewer, answers, {}, settings);

    expect(readStoredAnswers(edited.description)).toMatchObject({
      customPrompt: true,
      avatar: 'sol',
    });
  });

  it('is null for an agent whose description is not ours', () => {
    expect(currentAvatar({ ...withAvatar('sol'), description: 'Laget i RAGdoll' })).toBeNull();
  });
});
