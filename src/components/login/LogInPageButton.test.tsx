import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

import { handleSignOut } from '@/lib/auth';
import LogInPageButton from './LogInPageButton';

vi.mock('next/navigation', () => ({ usePathname: vi.fn() }));
vi.mock('next-auth/react', () => ({ useSession: vi.fn() }));
vi.mock('@/lib/auth', () => ({ handleSignOut: vi.fn() }));

type SessionState = ReturnType<typeof useSession>;

function mockSession(state: Pick<SessionState, 'data' | 'status'>) {
  vi.mocked(useSession).mockReturnValue({ ...state, update: vi.fn() } as SessionState);
}

const signedIn = {
  data: { expires: '2026-10-01T00:00:00Z', user: { name: 'Kari Nordmann' } },
  status: 'authenticated',
} as const;

describe('LogInPageButton', () => {
  beforeEach(() => {
    vi.mocked(usePathname).mockReturnValue('/');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows nothing while the session is loading, so "Log in" does not flash by', () => {
    mockSession({ data: null, status: 'loading' });

    const { container } = render(<LogInPageButton />);

    expect(container).toBeEmptyDOMElement();
  });

  it('links signed-out users to the log in page', () => {
    mockSession({ data: null, status: 'unauthenticated' });

    render(<LogInPageButton />);

    const link = screen.getByRole('link', { name: 'Log in' });
    expect(link).toHaveAttribute('href', '/login');
    expect(link).not.toHaveAttribute('aria-current');
    expect(screen.queryByRole('button', { name: 'Log out' })).not.toBeInTheDocument();
  });

  it('marks the link as the current page on /login', () => {
    vi.mocked(usePathname).mockReturnValue('/login');
    mockSession({ data: null, status: 'unauthenticated' });

    render(<LogInPageButton />);

    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('aria-current', 'page');
  });

  it("shows the signed-in user's name and a log out button instead of the link", () => {
    mockSession(signedIn);

    render(<LogInPageButton />);

    expect(screen.getByText('Kari Nordmann')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Log in' })).not.toBeInTheDocument();
  });

  it('logs the user out when they click Log out', async () => {
    mockSession(signedIn);
    render(<LogInPageButton />);

    await userEvent.click(screen.getByRole('button', { name: 'Log out' }));

    expect(handleSignOut).toHaveBeenCalledTimes(1);
  });
});
