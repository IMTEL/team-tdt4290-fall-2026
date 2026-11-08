import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Agent } from '@/lib/types';
import { updateAgent } from '../../api';
import { takeAgentHiddenFlash } from '../../flash';
import { useAgent } from '../../useAgent';
import { EditAgent } from './EditAgent';
import type { EditAgentForm } from './EditAgentForm';

// The form has its own tests. Here we only check what the page adds around it: the warning for a
// published agent, and the note for the agent's page when saving hid it.
const formProps = vi.hoisted(() => ({
  current: null as Parameters<typeof EditAgentForm>[0] | null,
}));

vi.mock('next/navigation', () => ({ notFound: vi.fn() }));
vi.mock('../../useAgent', () => ({ useAgent: vi.fn() }));
vi.mock('../../useAnswerPresets', () => ({
  useAnswerPresets: () => [],
  useLegalPreset: () => undefined,
}));
vi.mock('../../api', () => ({ updateAgent: vi.fn() }));
vi.mock('./EditAgentForm', () => ({
  EditAgentForm: (props: Parameters<typeof EditAgentForm>[0]) => {
    formProps.current = props;
    return null;
  },
}));

const useAgentMock = vi.mocked(useAgent);
const updateAgentMock = vi.mocked(updateAgent);

const agent: Agent = {
  id: 'agent-1',
  name: 'Intervjuer for Butikkmedarbeider',
  description: JSON.stringify({
    stilling: 'Butikkmedarbeider',
    bransje: 'Varehandel (privat)',
    bedrift: 'Nærbutikken AS',
    intervjutype: 'første intervju',
    intervjuer: 'butikksjef, vennlig',
    jobbsoker: 'under 25, lite erfaring',
    vanskelighetsgrad: 'lett',
    egneSporsmal: 'ingen',
    tillegg: '',
  }),
  lastUpdated: '2026-10-02T12:00:00.000Z',
  llmModel: 'openai/gpt-oss-120b',
  temperature: 0.3,
  maxTokens: 1000,
  prompt: 'Du er en intervjuer.',
};

const WARNING = /Agenten er publisert i The Candidate\. Når du lagrer, blir den gjemt/;

/** Saves the form as the counsellor would, with RAGdoll answering `saved`. */
async function save(saved: Agent) {
  updateAgentMock.mockResolvedValue(saved);
  await formProps.current?.onSave('Nytt navn', {}, {});
}

afterEach(() => {
  useAgentMock.mockReset();
  updateAgentMock.mockReset();
  formProps.current = null;
  sessionStorage.clear();
});

describe('EditAgent', () => {
  it('warns that saving hides a published agent', () => {
    useAgentMock.mockReturnValue({ kind: 'ready', agent: { ...agent, isPublished: true } });

    render(<EditAgent agentId="agent-1" />);

    expect(screen.getByText(WARNING)).toBeVisible();
  });

  it('has no warning for an agent that is not published', () => {
    useAgentMock.mockReturnValue({ kind: 'ready', agent });

    render(<EditAgent agentId="agent-1" />);

    expect(screen.queryByText(WARNING)).not.toBeInTheDocument();
  });

  it('leaves a note for the agent’s page when saving hid it', async () => {
    useAgentMock.mockReturnValue({ kind: 'ready', agent: { ...agent, isPublished: true } });
    render(<EditAgent agentId="agent-1" />);

    await save({ ...agent, isPublished: false });

    expect(takeAgentHiddenFlash('agent-1')).toBe(true);
  });

  it('leaves no note when the agent was not published', async () => {
    useAgentMock.mockReturnValue({ kind: 'ready', agent });
    render(<EditAgent agentId="agent-1" />);

    await save({ ...agent, isPublished: false });

    expect(takeAgentHiddenFlash('agent-1')).toBe(false);
  });
});
