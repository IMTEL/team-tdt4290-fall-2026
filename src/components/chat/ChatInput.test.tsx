import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ChatInput } from './ChatInput';

function setup(props: { disabled?: boolean } = {}) {
  const onSend = vi.fn();
  render(<ChatInput onSend={onSend} {...props} />);
  return {
    onSend,
    user: userEvent.setup(),
    box: screen.getByRole('textbox', { name: 'Melding' }),
    button: screen.getByRole('button', { name: 'Send' }),
  };
}

describe('ChatInput', () => {
  it('sends the trimmed text on Enter and clears the box', async () => {
    const { onSend, user, box } = setup();

    await user.type(box, '  Butikkmedarbeider  {Enter}');

    expect(onSend).toHaveBeenCalledExactlyOnceWith('Butikkmedarbeider');
    expect(box).toHaveValue('');
  });

  it('sends when the button is clicked', async () => {
    const { onSend, user, box, button } = setup();

    await user.type(box, 'Hei');
    await user.click(button);

    expect(onSend).toHaveBeenCalledExactlyOnceWith('Hei');
  });

  it('adds a new line on Shift+Enter instead of sending', async () => {
    const { onSend, user, box } = setup();

    await user.type(box, 'Linje 1{Shift>}{Enter}{/Shift}Linje 2');

    expect(onSend).not.toHaveBeenCalled();
    expect(box).toHaveValue('Linje 1\nLinje 2');
  });

  it('does not send blank text', async () => {
    const { onSend, user, box, button } = setup();

    await user.type(box, '   {Enter}');

    expect(onSend).not.toHaveBeenCalled();
    expect(button).toBeDisabled();
  });

  it('does not send while disabled, but keeps what the user typed', async () => {
    const { onSend, user, box, button } = setup({ disabled: true });

    await user.type(box, 'Hei{Enter}');

    expect(onSend).not.toHaveBeenCalled();
    expect(button).toBeDisabled();
    expect(box).toHaveValue('Hei');
  });
});
