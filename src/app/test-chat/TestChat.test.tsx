import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchAgents } from '@/app/browse-agents/api';
import { sendToAgent } from '@/components/chat/sendToAgent';
import { requestObserverFeedback } from './api';
import { TestChat } from './TestChat';

// The chat itself is tested in AgentChat.test.tsx. Here we only check what this page adds:
// that the agent is the counsellor's, the greeting, which agent answers, starting over, and the
// observer's feedback.
vi.mock('@/app/browse-agents/api', () => ({ fetchAgents: vi.fn() }));
const fetchAgentsMock = vi.mocked(fetchAgents);

const myAgents = ['agent-1', 'agent-2'].map((id) => ({
  id,
  name: `Intervjuer ${id}`,
  description: '',
  lastUpdated: '2026-10-09T10:00:00Z',
  llmModel: 'openai/gpt-oss-120b',
  temperature: 0.7,
  maxTokens: 1000,
  prompt: 'Du er en intervjuer.',
}));

vi.mock('@/components/chat/sendToAgent', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/chat/sendToAgent')>()),
  sendToAgent: vi.fn(),
}));
const sendMock = vi.mocked(sendToAgent);

vi.mock('./api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api')>()),
  requestObserverFeedback: vi.fn(),
}));
const observerMock = vi.mocked(requestObserverFeedback);

const observerFeedback = {
  kind: 'feedback' as const,
  wentWell: [
    { quote: 'fem år i butikk', comment: 'Du viste erfaring.', tip: 'Gi et konkret eksempel.' },
  ],
  toImprove: [
    { quote: 'vet ikke', comment: 'Svaret ble vagt.', tip: 'Si hva du liker med jobben.' },
  ],
};

// Renders the chat for agent-1 and waits until the agent has been found.
async function setup() {
  const user = userEvent.setup();
  const view = render(<TestChat agentId="agent-1" />);
  await screen.findByRole('textbox', { name: 'Melding' });
  const box = () => screen.getByRole('textbox', { name: 'Melding' });
  return { user, box, view };
}

describe('TestChat', () => {
  beforeEach(() => {
    fetchAgentsMock.mockResolvedValue(myAgents);
  });

  afterEach(() => {
    sendMock.mockReset();
    fetchAgentsMock.mockReset();
    observerMock.mockReset();
  });

  it('says the interviewer was not found when it is not among the counsellor’s agents', async () => {
    // Also what an agent of another counsellor looks like: it is not in this one's list.
    render(<TestChat agentId="000000000000000000000000" />);

    expect(await screen.findByText(/Fant ikke intervjueren/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'agentene dine' })).toHaveAttribute(
      'href',
      '/browse-agents',
    );
    expect(screen.queryByRole('textbox', { name: 'Melding' })).not.toBeInTheDocument();
  });

  it('shows an error and no chat when the agents cannot be loaded', async () => {
    fetchAgentsMock.mockRejectedValue(new Error('Noe gikk galt. Prøv igjen.'));
    render(<TestChat agentId="agent-1" />);

    expect(await screen.findByText('Noe gikk galt. Prøv igjen.')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Melding' })).not.toBeInTheDocument();
  });

  it('shows no chat while the agent is being looked up', () => {
    fetchAgentsMock.mockReturnValue(new Promise(() => {}));
    render(<TestChat agentId="agent-1" />);

    expect(screen.getByText('Laster intervjueren …')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Melding' })).not.toBeInTheDocument();
  });

  it('opens with the interviewer asking the job seeker to present themselves', async () => {
    await setup();

    expect(screen.getByText(/fortelle litt om deg selv\?/)).toBeInTheDocument();
  });

  it('sends the conversation, greeting included, to the agent being tested', async () => {
    sendMock.mockResolvedValue('Hva i CV-en din er relevant for stillingen?');
    const { user, box } = await setup();

    await user.type(box(), 'Jeg har jobbet i butikk i fem år.{Enter}');
    await screen.findByText('Hva i CV-en din er relevant for stillingen?');

    const [agent, history] = sendMock.mock.calls[0];
    expect(agent).toBe('agent-1');
    expect(history.map(({ role, content }) => ({ role, content }))).toEqual([
      { role: 'assistant', content: expect.stringContaining('velkommen til intervjuet') },
      { role: 'user', content: 'Jeg har jobbet i butikk i fem år.' },
    ]);
  });

  it('lets the counsellor rate the agent’s replies, but not the fixed greeting', async () => {
    sendMock.mockResolvedValue('Hva i CV-en din er relevant for stillingen?');
    const { user, box } = await setup();
    expect(screen.queryByRole('group', { name: 'Vurder svaret' })).not.toBeInTheDocument();

    await user.type(box(), 'Hei{Enter}');
    await screen.findByText('Hva i CV-en din er relevant for stillingen?');

    expect(screen.getAllByRole('group', { name: 'Vurder svaret' })).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Bra' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dårlig' })).toBeInTheDocument();
  });

  it('asks before starting over, and keeps the chat if cancelled', async () => {
    sendMock.mockResolvedValue('Hva i CV-en din er relevant for stillingen?');
    const { user, box } = await setup();
    await user.type(box(), 'Jeg har jobbet i butikk i fem år.{Enter}');
    await screen.findByText('Hva i CV-en din er relevant for stillingen?');

    await user.click(screen.getByRole('button', { name: 'Start på nytt' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Samtalen du er i forsvinner');

    await user.click(within(dialog).getByRole('button', { name: 'Avbryt' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Jeg har jobbet i butikk i fem år.')).toBeInTheDocument();
    expect(screen.getByText('Hva i CV-en din er relevant for stillingen?')).toBeInTheDocument();
  });

  it('goes back to the greeting when starting over is confirmed', async () => {
    sendMock.mockResolvedValue('Hva i CV-en din er relevant for stillingen?');
    const { user, box } = await setup();
    await user.type(box(), 'Jeg har jobbet i butikk i fem år.{Enter}');
    await screen.findByText('Hva i CV-en din er relevant for stillingen?');

    await user.click(screen.getByRole('button', { name: 'Start på nytt' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Start på nytt' }),
    );

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText(/fortelle litt om deg selv\?/)).toBeInTheDocument();
    expect(screen.queryByText('Jeg har jobbet i butikk i fem år.')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Hva i CV-en din er relevant for stillingen?'),
    ).not.toBeInTheDocument();
    expect(box()).toBeEnabled();
  });

  it('cancels a reply still on its way when starting over is confirmed', async () => {
    sendMock.mockReturnValue(new Promise(() => {}));
    const { user, box } = await setup();
    await user.type(box(), 'Hei{Enter}');
    const signal = sendMock.mock.calls[0][2];

    await user.click(screen.getByRole('button', { name: 'Start på nytt' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Start på nytt' }),
    );

    expect(signal?.aborted).toBe(true);
    expect(screen.queryByText('Assistenten skriver …')).not.toBeInTheDocument();
  });

  it('starts a new conversation with the new agent when the agent changes', async () => {
    sendMock.mockResolvedValue('Hva i CV-en din er relevant for stillingen?');
    const { user, box, view } = await setup();
    await user.type(box(), 'Jeg har jobbet i butikk i fem år.{Enter}');
    await screen.findByText('Hva i CV-en din er relevant for stillingen?');

    view.rerender(<TestChat agentId="agent-2" />);

    expect(screen.queryByText('Jeg har jobbet i butikk i fem år.')).not.toBeInTheDocument();
    await screen.findByRole('textbox', { name: 'Melding' });
    await user.type(box(), 'Hei{Enter}');
    expect(sendMock.mock.calls.at(-1)?.[0]).toBe('agent-2');
  });

  it('shows the observer’s points, each with the candidate’s words and a tip', async () => {
    sendMock.mockResolvedValue('Hvorfor søker du her?');
    observerMock.mockResolvedValue(observerFeedback);
    const { user, box } = await setup();
    await user.type(box(), 'Jeg har vært fem år i butikk.{Enter}');
    await screen.findByText('Hvorfor søker du her?');

    await user.click(screen.getByRole('button', { name: 'Be om tilbakemelding' }));

    const wentWell = await screen.findByRole('region', { name: 'Dette gikk bra' });
    expect(wentWell).toHaveTextContent('«fem år i butikk»');
    expect(wentWell).toHaveTextContent('Tips: Gi et konkret eksempel.');
    expect(screen.getByRole('region', { name: 'Dette kan bli bedre' })).toHaveTextContent(
      '«vet ikke»',
    );
    // The observer reads the whole conversation, greeting included.
    expect(observerMock.mock.calls[0][0].map(({ content }) => content)).toEqual([
      expect.stringContaining('velkommen til intervjuet'),
      'Jeg har vært fem år i butikk.',
      'Hvorfor søker du her?',
    ]);
  });

  it('can’t ask for feedback while the interviewer is still answering', async () => {
    sendMock.mockReturnValue(new Promise(() => {}));
    const { user, box } = await setup();

    await user.type(box(), 'Hei{Enter}');

    expect(screen.getByRole('button', { name: 'Be om tilbakemelding' })).toBeDisabled();
  });

  it('says why when the chat is too short for feedback', async () => {
    observerMock.mockResolvedValue({ kind: 'too-short', reason: 'Samtalen er for kort.' });
    const { user } = await setup();

    await user.click(screen.getByRole('button', { name: 'Be om tilbakemelding' }));

    expect(await screen.findByText('Samtalen er for kort.')).toBeInTheDocument();
  });

  it('shows the error and asks again on "Prøv igjen"', async () => {
    observerMock
      .mockRejectedValueOnce(new Error('Kunne ikke lage en tilbakemelding. Prøv igjen.'))
      .mockResolvedValueOnce(observerFeedback);
    const { user } = await setup();

    await user.click(screen.getByRole('button', { name: 'Be om tilbakemelding' }));
    await screen.findByText('Kunne ikke lage en tilbakemelding. Prøv igjen.');
    await user.click(screen.getByRole('button', { name: 'Prøv igjen' }));

    expect(await screen.findByRole('region', { name: 'Dette gikk bra' })).toBeInTheDocument();
    expect(observerMock).toHaveBeenCalledTimes(2);
  });

  it('clears the feedback when starting over', async () => {
    observerMock.mockResolvedValue(observerFeedback);
    const { user } = await setup();
    await user.click(screen.getByRole('button', { name: 'Be om tilbakemelding' }));
    await screen.findByRole('region', { name: 'Dette gikk bra' });

    await user.click(screen.getByRole('button', { name: 'Start på nytt' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Start på nytt' }),
    );

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.queryByRole('region', { name: 'Dette gikk bra' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Be om tilbakemelding' })).toBeEnabled();
  });
});
