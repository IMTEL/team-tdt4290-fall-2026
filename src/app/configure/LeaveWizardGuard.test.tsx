import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LeaveWizardGuard, leavesWizard } from './LeaveWizardGuard';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

afterEach(() => {
  push.mockReset();
  sessionStorage.clear();
});

describe('leavesWizard', () => {
  const origin = 'http://localhost:3000';

  it('lets the counsellor stay in the wizard and come back from a mal', () => {
    expect(leavesWizard('/configure?type=interviewer', origin)).toBe(false);
    expect(
      leavesWizard('/create-template?agentType=interviewer&returnTo=%2Fconfigure', origin),
    ).toBe(false);
    expect(leavesWizard('/profiles/new?returnTo=%2Fconfigure%3Ftype%3Dinterviewer', origin)).toBe(
      false,
    );
  });

  it('treats Agenter, Hjem and Maler as leaving', () => {
    expect(leavesWizard('/browse-agents', origin)).toBe(true);
    expect(leavesWizard('/', origin)).toBe(true);
    expect(leavesWizard('/templates', origin)).toBe(true);
  });
});

describe('LeaveWizardGuard', () => {
  it('asks before a link leaves the wizard, and Avbryt stays', async () => {
    const user = userEvent.setup();
    render(
      <>
        <LeaveWizardGuard />
        <a href="/browse-agents">Agenter</a>
      </>,
    );

    await user.click(screen.getByRole('link', { name: 'Agenter' }));

    const dialog = await screen.findByRole('dialog', { name: 'Forlate uten å lagre?' });
    expect(dialog).toHaveTextContent('Lagre utkastet');
    expect(push).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Avbryt' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(push).not.toHaveBeenCalled();
  });

  it('goes to the link when the counsellor confirms', async () => {
    const user = userEvent.setup();
    render(
      <>
        <LeaveWizardGuard />
        <a href="/browse-agents">Agenter</a>
      </>,
    );

    await user.click(screen.getByRole('link', { name: 'Agenter' }));
    await user.click(await screen.findByRole('button', { name: 'Forlat' }));

    expect(push).toHaveBeenCalledWith('/browse-agents');
  });

  it('saves the draft and follows the link from Lagre utkast', async () => {
    const user = userEvent.setup();
    render(
      <>
        <LeaveWizardGuard />
        <a href="/browse-agents">Agenter</a>
      </>,
    );

    await user.click(screen.getByRole('link', { name: 'Agenter' }));
    const dialog = await screen.findByRole('dialog', { name: 'Forlate uten å lagre?' });
    await user.click(within(dialog).getByRole('button', { name: 'Lagre utkast' }));

    expect(push).toHaveBeenCalledWith('/browse-agents');
    expect(sessionStorage.getItem('kfi-agents-flash')).toBe('utkast-lagret');
  });

  it('does not ask when a mal link will return to the wizard', async () => {
    const user = userEvent.setup();
    render(
      <>
        <LeaveWizardGuard />
        <a href="/create-template?returnTo=%2Fconfigure">Lag en ny intervjuermal</a>
      </>,
    );

    await user.click(screen.getByRole('link', { name: 'Lag en ny intervjuermal' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
