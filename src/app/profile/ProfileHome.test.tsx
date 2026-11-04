import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSession } from 'next-auth/react';

import { ProfileHome } from './ProfileHome';

const setTheme = vi.fn();

vi.mock('next-auth/react', () => ({ useSession: vi.fn() }));
vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light', setTheme }),
}));
vi.mock('@/lib/auth', () => ({ handleSignOut: vi.fn() }));

const agent = {
  id: 'agent-1',
  name: 'Intervjuer for lagerarbeider',
  description: '{}',
  lastUpdated: '2026-10-15T12:00:00.000Z',
  llmModel: 'openai/gpt-oss-120b',
  temperature: 0.7,
  maxTokens: 1000,
  prompt: 'prompt',
};

const template = {
  id: 'mal-1',
  agentType: 'interviewer',
  title: 'Truckfører',
  description: 'En mal',
  focus: ['Industri'],
  persona: 'Intervjueren er truckfører.',
};

beforeEach(() => {
  setTheme.mockReset();
  vi.mocked(useSession).mockReturnValue({
    data: {
      expires: '2026-12-01',
      user: { name: 'Kari Veileder', email: 'kari.veileder@example.no' },
    },
    status: 'authenticated',
    update: vi.fn(),
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (String(url).startsWith('/api/templates')) return Response.json({ templates: [template] });
      return Response.json({ agents: [agent] });
    }),
  );
});

describe('ProfileHome', () => {
  it('shows the account, the agents and the templates in the same kind of list', async () => {
    render(<ProfileHome />);

    expect(screen.getByRole('heading', { level: 1, name: 'Min profil' })).toBeVisible();
    expect(screen.getByRole('heading', { level: 2, name: 'Kari Veileder' })).toBeVisible();
    expect(screen.getByText('kari.veileder@example.no')).toBeVisible();
    expect(screen.queryByText('publisert')).not.toBeInTheDocument();

    expect(
      await screen.findByRole('link', { name: 'Intervjuer for lagerarbeider' }),
    ).toHaveAttribute('href', '/browse-agents/agent-1');
    expect(screen.getByRole('link', { name: 'Test' })).toHaveAttribute(
      'href',
      '/test-chat?agent=agent-1',
    );
    expect(screen.getByRole('columnheader', { name: 'Status' })).toBeVisible();

    expect(await screen.findByRole('link', { name: 'Truckfører' })).toHaveAttribute(
      'href',
      '/templates/mal-1/edit',
    );
    expect(screen.getByRole('columnheader', { name: 'Type' })).toBeVisible();
    expect(screen.getByText('Intervjuer')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Lag ny mal' })).toHaveAttribute(
      'href',
      '/create-template?agentType=interviewer',
    );
  });

  it('swaps Rediger profil for Lagre and stores the new name and email', async () => {
    const user = userEvent.setup();
    render(<ProfileHome />);

    await user.click(screen.getByRole('button', { name: 'Rediger profil' }));

    expect(screen.queryByRole('button', { name: 'Rediger profil' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bytt bilde' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Bytt bilde' }));
    expect(screen.getByRole('group', { name: 'Velg bilde' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Ugle' }));
    const name = screen.getByRole('textbox', { name: 'Brukernavn' });
    await user.clear(name);
    await user.type(name, 'Kari N.');
    await user.click(screen.getByRole('button', { name: 'Lagre' }));

    expect(await screen.findByRole('heading', { level: 2, name: 'Kari N.' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Rediger profil' })).toBeVisible();
    const put = vi.mocked(fetch).mock.calls.find((call) => {
      const init = call[1] as RequestInit | undefined;
      return init?.method === 'PUT';
    });
    expect(
      JSON.parse(String(put?.[1] && (put[1] as RequestInit).body)).settings.profile,
    ).toMatchObject({
      name: 'Kari N.',
      email: 'kari.veileder@example.no',
      image: 'ugle',
    });
  });

  it('asks a signed-out visitor to log in', () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: vi.fn(),
    });

    render(<ProfileHome />);

    expect(screen.getByRole('link', { name: 'Logg inn' })).toHaveAttribute('href', '/login');
  });
});
