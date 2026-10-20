import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { NewAgentCard } from './NewAgentCard';

const push = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

describe('NewAgentCard', () => {
  it('opens a dialog to choose the agent type, and leaves planned types unchoosable', async () => {
    const user = userEvent.setup();
    render(<NewAgentCard />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Ny agent/ }));

    const dialog = screen.getByRole('dialog', { name: 'Hva slags agent vil du sette opp?' });
    expect(within(dialog).getByRole('button', { name: /^Intervjuer/ })).toBeVisible();
    const teacher = within(dialog).getByRole('heading', { level: 3, name: 'Lærer' }).closest('li')!;
    expect(teacher).toHaveTextContent('Kommer snart');
    expect(teacher.querySelector('button')).toBeNull();
  });

  it('opens the configurator with the chosen type', async () => {
    const user = userEvent.setup();
    render(<NewAgentCard />);

    await user.click(screen.getByRole('button', { name: /Ny agent/ }));
    await user.click(screen.getByRole('button', { name: /^Intervjuer/ }));

    expect(push).toHaveBeenCalledWith('/configure?type=interviewer');
  });
});
