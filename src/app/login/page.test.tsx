import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import userEvent from '@testing-library/user-event';
import { keycloakSignIn } from '@/lib/auth';
import LogInPage from './page';

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/auth', () => ({ keycloakSignIn: vi.fn(), keycloakRegister: vi.fn() }));
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

    expect(screen.getByRole('heading', { level: 1, name: 'Logg inn' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Logg inn' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Opprett konto' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows an error when Keycloak sent the user back with ?error', async () => {
    await renderPage({ error: 'OAuthCallback' });

    expect(screen.getByRole('alert')).toHaveTextContent('Innloggingen mislyktes');
  });

  it('sends the user back to the page they wanted after logging in', async () => {
    await renderPage({ callbackUrl: '/configure' });

    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(keycloakSignIn).toHaveBeenCalledWith('/configure');
  });

  it('redirects users who are already signed in to the start page', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ expires: '' });

    await renderPage();

    expect(redirect).toHaveBeenCalledWith('/');
  });
});
