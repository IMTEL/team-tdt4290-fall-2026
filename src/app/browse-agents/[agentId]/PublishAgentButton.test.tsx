import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { publishAgent, unpublishAgent, type Publication } from '../api';
import { PublishAgentButton } from './PublishAgentButton';

vi.mock('../api', () => ({ publishAgent: vi.fn(), unpublishAgent: vi.fn() }));

const publishAgentMock = vi.mocked(publishAgent);
const unpublishAgentMock = vi.mocked(unpublishAgent);

const agent = {
  id: 'agent-1',
  name: 'Intervjuer for Barnehagelærer',
  description: '{}',
  lastUpdated: '2026-10-02T12:00:00.000Z',
  llmModel: 'openai/gpt-oss-120b',
  temperature: 0.7,
  prompt: 'Du er en intervjuer.',
};
const hidden: Publication = { isPublished: false, publicName: '', publicDescription: '' };
const published: Publication = {
  isPublished: true,
  publicName: 'Kari fra barnehagen',
  publicDescription: 'Øv på et første intervju',
};

function renderButton(publication: Publication) {
  const onChange = vi.fn();
  render(<PublishAgentButton agent={agent} publication={publication} onChange={onChange} />);
  return { user: userEvent.setup(), onChange };
}

describe('PublishAgentButton', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('publishes with the agent name and a short description', async () => {
    publishAgentMock.mockResolvedValue(published);
    const { user, onChange } = renderButton(hidden);

    await user.click(screen.getByRole('button', { name: 'Publiser' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Ikke skriv noe om jobbsøkeren her.')).toBeVisible();
    expect(within(dialog).getByLabelText(/Navn i The Candidate/)).toHaveValue(agent.name);

    await user.type(within(dialog).getByLabelText('Kort beskrivelse'), 'Øv på et første intervju');
    await user.click(within(dialog).getByRole('button', { name: 'Publiser' }));

    expect(publishAgentMock).toHaveBeenCalledWith(
      'agent-1',
      agent.name,
      'Øv på et første intervju',
    );
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(published));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('does not publish without a name', async () => {
    const { user } = renderButton(hidden);

    await user.click(screen.getByRole('button', { name: 'Publiser' }));
    const dialog = screen.getByRole('dialog');
    await user.clear(within(dialog).getByLabelText(/Navn i The Candidate/));

    expect(within(dialog).getByRole('button', { name: 'Publiser' })).toBeDisabled();
    expect(within(dialog).getByText('Skriv et navn.')).toBeVisible();
    expect(publishAgentMock).not.toHaveBeenCalled();
  });

  it('shows the error and stays open when publishing fails', async () => {
    publishAgentMock.mockRejectedValue(
      new Error('Bare eieren kan publisere eller gjemme agenten.'),
    );
    const { user, onChange } = renderButton(hidden);

    await user.click(screen.getByRole('button', { name: 'Publiser' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Publiser' }));

    expect(
      await within(dialog).findByText('Bare eieren kan publisere eller gjemme agenten.'),
    ).toBeVisible();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('hides a published agent after asking', async () => {
    unpublishAgentMock.mockResolvedValue({ ...published, isPublished: false });
    const { user, onChange } = renderButton(published);

    expect(screen.queryByRole('button', { name: 'Publiser' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Gjem agent' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Gjemme «Kari fra barnehagen»?')).toBeVisible();

    await user.click(within(dialog).getByRole('button', { name: 'Gjem agent' }));

    expect(unpublishAgentMock).toHaveBeenCalledWith('agent-1');
    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith({ ...published, isPublished: false }),
    );
  });

  it('hides nothing when the user cancels', async () => {
    const { user } = renderButton(published);

    await user.click(screen.getByRole('button', { name: 'Gjem agent' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Avbryt' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(unpublishAgentMock).not.toHaveBeenCalled();
  });
});
