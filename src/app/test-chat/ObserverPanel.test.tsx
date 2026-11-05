import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ChatMessage } from '@/components/chat/types';
import { ObserverPanel } from './ObserverPanel';
import { requestObserverFeedback } from './api';

vi.mock('./api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api')>()),
  requestObserverFeedback: vi.fn(),
}));
const observerMock = vi.mocked(requestObserverFeedback);

const messages: ChatMessage[] = [
  { id: '1', role: 'assistant', content: 'Kan du fortelle litt om deg selv?' },
  { id: '2', role: 'user', content: 'Jeg har jobbet i butikk i tre år.' },
  { id: '3', role: 'assistant', content: 'Hvorfor søker du her?' },
  { id: '4', role: 'user', content: 'Jeg vet ikke helt hva jeg skal si.' },
];

const point = (quote: string, comment: string, tip: string) => ({ quote, comment, tip });

afterEach(() => {
  observerMock.mockReset();
});

async function ask(feedback: Awaited<ReturnType<typeof requestObserverFeedback>>) {
  observerMock.mockResolvedValue(feedback);
  const user = userEvent.setup();
  render(<ObserverPanel messages={messages} disabled={false} />);
  await user.click(screen.getByRole('button', { name: 'Be om tilbakemelding' }));
  return user;
}

describe('ObserverPanel', () => {
  it('shows each point as the question that was asked and how it was judged', async () => {
    await ask({
      kind: 'feedback',
      wentWell: [point('i tre år', 'Du viste erfaring.', 'Gi et konkret eksempel.')],
      toImprove: [point('jeg vet ikke helt', 'Svaret ble vagt.', 'Si hva du liker med jobben.')],
    });

    const cards = await screen.findAllByRole('article', { name: 'Spørsmål og vurdering' });
    expect(cards).toHaveLength(2);

    expect(cards[0]).toHaveTextContent('Spørsmålet som ble stilt');
    expect(cards[0]).toHaveTextContent('Kan du fortelle litt om deg selv?');
    expect(cards[0]).toHaveTextContent('Slik ble det vurdert');
    expect(cards[0]).toHaveTextContent('Gikk bra');
    expect(cards[0]).toHaveTextContent('«i tre år»');
    expect(cards[0]).toHaveTextContent('Du viste erfaring.');
    expect(cards[0]).toHaveTextContent('Tips: Gi et konkret eksempel.');

    expect(cards[1]).toHaveTextContent('Hvorfor søker du her?');
    expect(cards[1]).toHaveTextContent('Kan bli bedre');
    expect(cards[1]).toHaveTextContent('«jeg vet ikke helt»');
    expect(screen.queryByRole('region', { name: 'Sammendrag' })).not.toBeInTheDocument();
  });

  it('shows a summary when there are many points, until «Vis hvert spørsmål»', async () => {
    const user = await ask({
      kind: 'feedback',
      wentWell: [
        point('i tre år', 'Du viste erfaring.', 'Tips 1'),
        point('jobbet i butikk', 'Du var konkret.', 'Tips 2'),
      ],
      toImprove: [
        point('jeg vet ikke helt', 'Svaret ble vagt.', 'Tips 3'),
        point('hva jeg skal si', 'Du nølte.', 'Tips 4'),
      ],
    });

    const summary = await screen.findByRole('region', { name: 'Sammendrag' });
    expect(summary).toHaveTextContent(
      'Observatøren vurderte 4 svar: 2 gikk bra, og 2 kan bli bedre.',
    );
    expect(screen.queryByRole('article', { name: 'Spørsmål og vurdering' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Vis hvert spørsmål' }));

    expect(screen.getAllByRole('article', { name: 'Spørsmål og vurdering' })).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'Skjul spørsmålene' }));
    expect(screen.queryByRole('article', { name: 'Spørsmål og vurdering' })).not.toBeInTheDocument();
  });

  it('hides the observer’s system prompt until it is opened', async () => {
    render(
      <ObserverPanel
        messages={messages}
        disabled={false}
        prompt={'Du er en observatør.\n\n## Tilbakemeldingen'}
      />,
    );

    const toggle = screen.getByRole('button', { name: 'Observatørens systemprompt' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(/Du er en observatør/)).not.toBeVisible();

    await userEvent.setup().click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/Du er en observatør/)).toBeVisible();
    expect(
      screen.getByText(/Dette er instruksjonene observatøren følger når den gir tilbakemelding/),
    ).toBeVisible();
  });

  it('does not offer the system prompt when none was given', () => {
    render(<ObserverPanel messages={messages} disabled={false} />);

    expect(
      screen.queryByRole('button', { name: 'Observatørens systemprompt' }),
    ).not.toBeInTheDocument();
  });
});
