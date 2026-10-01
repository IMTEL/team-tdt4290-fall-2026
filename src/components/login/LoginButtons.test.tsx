import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { keycloakRegister, keycloakSignIn } from '@/lib/auth';
import { LoginButtons } from './LoginButtons';

vi.mock('@/lib/auth', () => ({ keycloakSignIn: vi.fn(), keycloakRegister: vi.fn() }));

describe('LoginButtons', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('logs in with Keycloak and returns to the start page by default', async () => {
    render(<LoginButtons />);

    await userEvent.click(screen.getByRole('button', { name: 'Logg inn' }));

    expect(keycloakSignIn).toHaveBeenCalledWith('/');
    expect(keycloakRegister).not.toHaveBeenCalled();
  });

  it("opens Keycloak's registration form from Create account", async () => {
    render(<LoginButtons />);

    await userEvent.click(screen.getByRole('button', { name: 'Opprett konto' }));

    expect(keycloakRegister).toHaveBeenCalledWith('/');
    expect(keycloakSignIn).not.toHaveBeenCalled();
  });

  it('sends the user back to the page they wanted after logging in or signing up', async () => {
    render(<LoginButtons callbackUrl="/configure" />);

    await userEvent.click(screen.getByRole('button', { name: 'Logg inn' }));
    await userEvent.click(screen.getByRole('button', { name: 'Opprett konto' }));

    expect(keycloakSignIn).toHaveBeenCalledWith('/configure');
    expect(keycloakRegister).toHaveBeenCalledWith('/configure');
  });
});
