import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { deleteAgent } from '../api';
import { DeleteAgentButton } from './DeleteAgentButton';

const push = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('../api', () => ({ deleteAgent: vi.fn() }));

const deleteAgentMock = vi.mocked(deleteAgent);

const agent = {
  id: 'agent-1',
  name: 'Intervjuer for Barnehagelærer',
  description: '{}',
  lastUpdated: '2026-10-02T12:00:00.000Z',
  llmModel: 'openai/gpt-oss-120b',
  temperature: 0.7,
  maxTokens: 1000,
  prompt: 'Du er en intervjuer.',
};

async function openDialog() {
  const user = userEvent.setup();
  render(<DeleteAgentButton agent={agent} />);
  await user.click(screen.getByRole('button', { name: 'Slett' }));
  return { user, dialog: screen.getByRole('dialog') };
}

describe('DeleteAgentButton', () => {
  afterEach(() => {
    deleteAgentMock.mockReset();
    push.mockClear();
  });

  it('asks before deleting, and deletes nothing when the user cancels', async () => {
    const { user, dialog } = await openDialog();

    expect(within(dialog).getByText(`Slette «${agent.name}»?`)).toBeVisible();

    await user.click(within(dialog).getByRole('button', { name: 'Avbryt' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(deleteAgentMock).not.toHaveBeenCalled();
  });

  it('deletes the agent and goes back to the list when the user confirms', async () => {
    deleteAgentMock.mockResolvedValue(undefined);
    const { user, dialog } = await openDialog();

    await user.click(within(dialog).getByRole('button', { name: 'Slett' }));

    expect(deleteAgentMock).toHaveBeenCalledWith('agent-1');
    await waitFor(() => expect(push).toHaveBeenCalledWith('/browse-agents'));
  });

  it('shows the error and stays open when the delete fails', async () => {
    deleteAgentMock.mockRejectedValue(new Error('Bare eieren kan slette agenten.'));
    const { user, dialog } = await openDialog();

    await user.click(within(dialog).getByRole('button', { name: 'Slett' }));

    expect(await within(dialog).findByText('Bare eieren kan slette agenten.')).toBeVisible();
    expect(within(dialog).getByRole('button', { name: 'Slett' })).toBeEnabled();
    expect(push).not.toHaveBeenCalled();
  });
});
