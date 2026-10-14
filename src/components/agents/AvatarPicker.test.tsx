import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AVATARS } from '@/domain/avatars';
import { AvatarPicker } from './AvatarPicker';

describe('AvatarPicker', () => {
  it('offers the default image and every avatar, as radio buttons with a name each', () => {
    render(<AvatarPicker value={null} onChange={vi.fn()} />);

    expect(screen.getByRole('radiogroup', { name: 'Avatar' })).toBeVisible();
    expect(screen.getAllByRole('radio')).toHaveLength(AVATARS.length + 1);
    // The radio button itself is hidden by MUI, so the text under the picture is what shows.
    expect(screen.getByText('Standard')).toBeVisible();
    for (const { label } of AVATARS) {
      expect(screen.getByRole('radio', { name: label })).toBeInTheDocument();
      expect(screen.getByText(label)).toBeVisible();
    }
  });

  it('shows the default image as chosen when the agent has no avatar', () => {
    render(<AvatarPicker value={null} onChange={vi.fn()} />);

    expect(screen.getByRole('radio', { name: 'Standard' })).toBeChecked();
  });

  it('shows the agent’s avatar as chosen', () => {
    render(<AvatarPicker value="ugle" onChange={vi.fn()} />);

    expect(screen.getByRole('radio', { name: 'Ugle' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Standard' })).not.toBeChecked();
  });

  it('shows an avatar we no longer have as the default image', () => {
    render(<AvatarPicker value="fjernet-avatar" onChange={vi.fn()} />);

    expect(screen.getByRole('radio', { name: 'Standard' })).toBeChecked();
  });

  it('reports the id of the avatar that is chosen', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<AvatarPicker value={null} onChange={onChange} />);

    await user.click(screen.getByRole('radio', { name: 'Rev' }));

    expect(onChange).toHaveBeenCalledWith('rev');
  });

  it('reports null when the default image is chosen again', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<AvatarPicker value="rev" onChange={onChange} />);

    await user.click(screen.getByRole('radio', { name: 'Standard' }));

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('cannot be changed while disabled', () => {
    render(<AvatarPicker value={null} onChange={vi.fn()} disabled />);

    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).toBeDisabled();
    }
  });
});
