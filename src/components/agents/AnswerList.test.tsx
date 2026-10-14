import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AnswerList } from './AnswerList';

const fields = [
  { key: 'stilling', label: 'Stilling' },
  { key: 'tillegg', label: 'Tillegg', optional: true },
];

describe('AnswerList', () => {
  it('shows each label with its answer, and a dash for an empty one', () => {
    render(<AnswerList fields={fields} answers={{ stilling: 'Kokk', tillegg: '' }} />);

    expect(screen.getByText('Stilling').nextElementSibling).toHaveTextContent('Kokk');
    expect(screen.getByText('Tillegg').nextElementSibling).toHaveTextContent('–');
  });
});
