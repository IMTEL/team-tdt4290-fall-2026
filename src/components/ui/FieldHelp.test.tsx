import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { FieldHelp } from './FieldHelp';

describe('FieldHelp', () => {
  it('names the question mark after the field and shows what the field means', async () => {
    const user = userEvent.setup();
    render(<FieldHelp label="Stilling" description="Hva jobben heter." />);

    const help = screen.getByRole('button', { name: 'Hva betyr Stilling?' });
    await user.hover(help);

    expect(await screen.findByRole('tooltip', { name: 'Hva jobben heter.' })).toBeVisible();
  });
});
