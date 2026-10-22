import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { rateReply, undoRating } from './api';
import { RateReply } from './RateReply';

vi.mock('./api', () => ({ rateReply: vi.fn(), undoRating: vi.fn() }));
const rateReplyMock = vi.mocked(rateReply);
const undoRatingMock = vi.mocked(undoRating);

const reply = 'Hvorfor søker du denne stillingen?';
const userMessage = 'Hei, jeg heter Kari.';

function stored(rating: 'good' | 'bad', comment = '') {
  return {
    id: 'feedback-1',
    rating,
    agentMessage: reply,
    userMessage,
    comment,
    createdAt: '2026-10-21T10:00:00',
  };
}

function setup() {
  const user = userEvent.setup();
  render(<RateReply agentId="agent-1" reply={reply} userMessage={userMessage} />);
  return { user };
}

describe('RateReply', () => {
  afterEach(() => {
    rateReplyMock.mockReset();
    undoRatingMock.mockReset();
  });

  it('starts unrated, with a good and a bad button and no comment field', () => {
    setup();

    expect(screen.getByRole('button', { name: 'Bra' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Dårlig' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('scrolls the comment field into view when it opens', async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    const { user } = setup();
    expect(scrollIntoView).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Bra' }));

    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });
    // @ts-expect-error jsdom has no scrollIntoView; remove the stub again.
    delete Element.prototype.scrollIntoView;
  });

  it('opens a comment field after a thumb and sends the rating with the reply and comment', async () => {
    rateReplyMock.mockResolvedValue(stored('bad', 'Spør om erfaring.'));
    const { user } = setup();

    await user.click(screen.getByRole('button', { name: 'Dårlig' }));
    expect(screen.getByRole('button', { name: 'Dårlig' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('textbox', { name: 'Kommentar (valgfritt)' }));
    await user.paste('Spør om erfaring.');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(rateReplyMock).toHaveBeenCalledExactlyOnceWith('agent-1', {
      rating: 'bad',
      agentMessage: reply,
      userMessage,
      comment: 'Spør om erfaring.',
    });
    expect(await screen.findByText('Vurdert som dårlig')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    // Only the chosen thumb is left.
    expect(screen.queryByRole('button', { name: 'Bra' })).not.toBeInTheDocument();
  });

  it('sends a rating without a comment', async () => {
    rateReplyMock.mockResolvedValue(stored('good'));
    const { user } = setup();

    await user.click(screen.getByRole('button', { name: 'Bra' }));
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(rateReplyMock).toHaveBeenCalledWith('agent-1', expect.objectContaining({ comment: '' }));
    expect(await screen.findByText('Vurdert som bra')).toBeInTheDocument();
  });

  it('cancels back to unrated without sending anything', async () => {
    const { user } = setup();

    await user.click(screen.getByRole('button', { name: 'Bra' }));
    await user.click(screen.getByRole('button', { name: 'Avbryt' }));

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bra' })).toHaveAttribute('aria-pressed', 'false');
    expect(rateReplyMock).not.toHaveBeenCalled();
  });

  it('undoes a saved rating by deleting it with its id', async () => {
    rateReplyMock.mockResolvedValue(stored('good'));
    undoRatingMock.mockResolvedValue(undefined);
    const { user } = setup();

    await user.click(screen.getByRole('button', { name: 'Bra' }));
    await user.click(screen.getByRole('button', { name: 'Send' }));
    await user.click(await screen.findByRole('button', { name: 'Angre' }));

    expect(undoRatingMock).toHaveBeenCalledExactlyOnceWith('agent-1', 'feedback-1');
    expect(await screen.findByRole('button', { name: 'Dårlig' })).toBeInTheDocument();
    expect(screen.queryByText('Vurdert som bra')).not.toBeInTheDocument();
  });

  it('shows the error when saving fails and keeps the comment so it can be sent again', async () => {
    rateReplyMock
      .mockRejectedValueOnce(new Error('Kunne ikke lagre vurderingen. Prøv igjen.'))
      .mockResolvedValueOnce(stored('bad', 'For lang'));
    const { user } = setup();

    await user.click(screen.getByRole('button', { name: 'Dårlig' }));
    await user.click(screen.getByRole('textbox', { name: 'Kommentar (valgfritt)' }));
    await user.paste('For lang');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Kunne ikke lagre vurderingen. Prøv igjen.',
    );
    expect(screen.getByRole('textbox', { name: 'Kommentar (valgfritt)' })).toHaveValue('For lang');

    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByText('Vurdert som dårlig')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(rateReplyMock).toHaveBeenCalledTimes(2);
  });

  it('shows the error when undoing fails and keeps the rating so it can be undone again', async () => {
    rateReplyMock.mockResolvedValue(stored('good'));
    undoRatingMock.mockRejectedValueOnce(new Error('Kunne ikke angre vurderingen. Prøv igjen.'));
    const { user } = setup();

    await user.click(screen.getByRole('button', { name: 'Bra' }));
    await user.click(screen.getByRole('button', { name: 'Send' }));
    await user.click(await screen.findByRole('button', { name: 'Angre' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Kunne ikke angre vurderingen. Prøv igjen.',
    );
    expect(screen.getByText('Vurdert som bra')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Angre' })).toBeEnabled();
  });
});
