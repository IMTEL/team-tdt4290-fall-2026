import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AnswerEffects } from './AnswerEffects';

const effects = [
  { key: 'stilling', label: 'Stilling', effects: ['Spørsmålene handler om stillingen kokk.'] },
  {
    key: 'vanskelighetsgrad',
    label: 'Vanskelighetsgrad',
    effects: ['Enkle og åpne spørsmål.', '6 spørsmål i alt.'],
  },
];

describe('AnswerEffects', () => {
  it('lists each answer with how it shapes the agent', () => {
    render(<AnswerEffects effects={effects} customPrompt={false} />);

    expect(screen.getByText('Stilling').nextElementSibling).toHaveTextContent(
      'Spørsmålene handler om stillingen kokk.',
    );
    // Several effects of one answer are a list of their own.
    const items = screen.getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual([
      'Enkle og åpne spørsmål.',
      '6 spørsmål i alt.',
    ]);
    // Each column is its own list, so a tall answer cannot leave a hole beside a short one.
    expect(document.querySelectorAll('dl')).toHaveLength(2);
  });

  it('says the answers change nothing when the prompt was written by hand', () => {
    render(<AnswerEffects effects={effects} customPrompt />);

    expect(
      screen.getByText(
        'Systemprompten er skrevet for hånd, så svarene endrer ikke hvordan agenten oppfører seg.',
      ),
    ).toBeVisible();
    expect(screen.queryByText('Stilling')).not.toBeInTheDocument();
  });
});
