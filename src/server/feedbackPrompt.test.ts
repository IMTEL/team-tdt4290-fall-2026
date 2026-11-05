import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  FEEDBACK_SECTION_HEADING,
  MAX_DETAILED_RATINGS,
  RATING_SUMMARY_MARKER,
  withFeedbackSection,
} from '@/domain/interviewerFeedbackPrompt';
import { syncAgentPromptWithFeedback } from './feedbackPrompt';
import { askAgent, fetchFullAgent, listFeedback, updateAgent } from './ragdoll';

vi.mock('./ragdoll', async (importOriginal) => {
  const original = await importOriginal<typeof import('./ragdoll')>();
  return {
    ...original,
    askAgent: vi.fn(),
    fetchFullAgent: vi.fn(),
    listFeedback: vi.fn(),
    updateAgent: vi.fn(),
  };
});

const askAgentMock = vi.mocked(askAgent);
const fetchFullAgentMock = vi.mocked(fetchFullAgent);
const listFeedbackMock = vi.mocked(listFeedback);
const updateAgentMock = vi.mocked(updateAgent);

const agent = {
  id: 'agent-1',
  name: 'Kari',
  description: '{}',
  prompt: 'Du er en intervjuer.',
  roles: [],
  llm_provider: 'idun',
  llm_model: 'openai/gpt-oss-120b',
  llm_temperature: 0.7,
  llm_api_key: '',
  embedding_model: '',
  embedding_api_key: '',
  context_aware_retrieval: false,
  last_updated: '2026-10-01T00:00:00.000Z',
};

const rating = {
  id: 'feedback-1',
  agent_id: 'agent-1',
  rating: 'bad' as const,
  agent_message: 'Hvorfor søker du her?',
  user_message: 'Jeg har jobbet i butikk.',
  comment: 'Spør om erfaring først.',
  created_at: '2026-11-05T12:00:00',
};

beforeEach(() => {
  fetchFullAgentMock.mockResolvedValue(agent);
  listFeedbackMock.mockResolvedValue([rating]);
  updateAgentMock.mockResolvedValue({
    id: 'agent-1',
    name: 'Kari',
    description: '{}',
    lastUpdated: '2026-11-05T12:00:00.000Z',
    llmModel: agent.llm_model,
    temperature: 0.7,
    prompt: agent.prompt,
  });
});

function manyRatings() {
  return Array.from({ length: MAX_DETAILED_RATINGS + 1 }, (_, i) => ({
    ...rating,
    id: `feedback-${i}`,
    comment: `Kommentar ${i}`,
  }));
}

afterEach(() => {
  askAgentMock.mockReset();
  fetchFullAgentMock.mockReset();
  listFeedbackMock.mockReset();
  updateAgentMock.mockReset();
  vi.unstubAllEnvs();
});

describe('syncAgentPromptWithFeedback', () => {
  it('writes the ratings into the stored prompt', async () => {
    await syncAgentPromptWithFeedback('session-token', 'agent-1');

    expect(listFeedbackMock).toHaveBeenCalledWith('session-token', 'agent-1', 200);
    const [, saved] = updateAgentMock.mock.calls[0];
    expect(saved.prompt).toContain(FEEDBACK_SECTION_HEADING);
    expect(saved.prompt).toContain('Spør om erfaring først.');
    expect(saved.prompt.startsWith('Du er en intervjuer.')).toBe(true);
    expect(askAgentMock).not.toHaveBeenCalled();
  });

  it('does not write when the prompt already matches the ratings', async () => {
    const already = withFeedbackSection(agent.prompt, [
      {
        id: rating.id,
        rating: rating.rating,
        agentMessage: rating.agent_message,
        userMessage: rating.user_message,
        comment: rating.comment,
        createdAt: rating.created_at,
      },
    ]);
    fetchFullAgentMock.mockResolvedValue({ ...agent, prompt: already });

    await syncAgentPromptWithFeedback('session-token', 'agent-1');

    expect(updateAgentMock).not.toHaveBeenCalled();
  });

  it('removes the ratings block when every rating is undone', async () => {
    const withRatings = `${agent.prompt}\n\n${FEEDBACK_SECTION_HEADING}\nEn gammel vurdering.`;
    fetchFullAgentMock.mockResolvedValue({ ...agent, prompt: withRatings });
    listFeedbackMock.mockResolvedValue([]);

    await syncAgentPromptWithFeedback('session-token', 'agent-1');

    const [, saved] = updateAgentMock.mock.calls[0];
    expect(saved.prompt).toBe('Du er en intervjuer.');
    expect(saved.prompt).not.toContain(FEEDBACK_SECTION_HEADING);
  });

  it('asks the observer to summarise when there are many ratings', async () => {
    vi.stubEnv('RAGDOLL_OBSERVER_AGENT_ID', 'obs-1');
    vi.stubEnv('RAGDOLL_OBSERVER_ACCESS_KEY', 'obs-key');
    listFeedbackMock.mockResolvedValue(manyRatings());
    askAgentMock.mockResolvedValue('Still ett spørsmål om gangen, og spør om erfaring først.');

    await syncAgentPromptWithFeedback('session-token', 'agent-1');

    expect(askAgentMock).toHaveBeenCalledWith(
      { id: 'obs-1', accessKey: 'obs-key' },
      [{ role: 'user', content: expect.stringContaining(RATING_SUMMARY_MARKER) }],
    );
    const [, saved] = updateAgentMock.mock.calls[0];
    expect(saved.prompt).toContain('Still ett spørsmål om gangen, og spør om erfaring først.');
    expect(saved.prompt).not.toContain('Unngå: Kommentar 0');
  });

  it('lists the comments when the observer does not answer', async () => {
    vi.stubEnv('RAGDOLL_OBSERVER_AGENT_ID', 'obs-1');
    vi.stubEnv('RAGDOLL_OBSERVER_ACCESS_KEY', 'obs-key');
    listFeedbackMock.mockResolvedValue(manyRatings());
    askAgentMock.mockRejectedValue(new Error('timeout'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await syncAgentPromptWithFeedback('session-token', 'agent-1');

    const [, saved] = updateAgentMock.mock.calls[0];
    expect(saved.prompt).toContain('Unngå: Kommentar 0');
  });

  it('lists the comments when the observer replies as job-seeker feedback', async () => {
    vi.stubEnv('RAGDOLL_OBSERVER_AGENT_ID', 'obs-1');
    vi.stubEnv('RAGDOLL_OBSERVER_ACCESS_KEY', 'obs-key');
    listFeedbackMock.mockResolvedValue(manyRatings());
    askAgentMock.mockResolvedValue(
      'Bra: fem år i butikk | Du viste erfaring. | Gi et konkret eksempel.',
    );

    await syncAgentPromptWithFeedback('session-token', 'agent-1');

    const [, saved] = updateAgentMock.mock.calls[0];
    expect(saved.prompt).toContain('Unngå: Kommentar 0');
    expect(saved.prompt).not.toContain('Bra: fem år i butikk');
  });
});
