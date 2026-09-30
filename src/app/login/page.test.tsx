import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import LogInPage from './page';

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
vi.mock('@/lib/auth-options', () => ({ authOptions: {} }));

// LogInPage is an async server component, so await it and render the element it returns.
async function renderPage(searchParams: { error?: string; callbackUrl?: string } = {}) {
  render(await LogInPage({ searchParams: Promise.resolve(searchParams) }));
}

describe('LogInPage', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows the log in heading and the Keycloak buttons', async () => {
    await renderPage();

    expect(screen.getByRole('heading', { level: 1, name: 'Log in' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows an error when Keycloak sent the user back with ?error', async () => {
    await renderPage({ error: 'OAuthCallback' });

    expect(screen.getByRole('alert')).toHaveTextContent('Log in failed');
  });

  it('redirects users who are already signed in to the start page', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ expires: '' });

    await renderPage();

    expect(redirect).toHaveBeenCalledWith('/');
  });
});
