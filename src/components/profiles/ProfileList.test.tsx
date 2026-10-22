import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { deleteProfile, fetchProfiles } from './api';
import { ProfileList } from './ProfileList';

vi.mock('./api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api')>()),
  fetchProfiles: vi.fn(),
  deleteProfile: vi.fn(),
}));
const fetchMock = vi.mocked(fetchProfiles);
const deleteMock = vi.mocked(deleteProfile);

const profile = {
  id: 'profile-1',
  label: 'Profil A',
  ageRange: '18-24' as const,
  experienceLevel: 'little' as const,
  workExperience: '',
  education: '',
  languages: [],
  practiceAreas: ['Mestre nervøsitet'],
  notes: '',
};

afterEach(() => {
  fetchMock.mockReset();
  deleteMock.mockReset();
});

describe('ProfileList', () => {
  it('shows each profile with a summary, practice areas and an edit link', async () => {
    fetchMock.mockResolvedValue([profile]);
    render(<ProfileList />);

    expect(await screen.findByRole('heading', { name: 'Profil A' })).toBeInTheDocument();
    expect(screen.getByText('18–24 år · Litt (under 1 år)')).toBeInTheDocument();
    expect(screen.getByText('Mestre nervøsitet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Rediger Profil A' })).toHaveAttribute(
      'href',
      '/profiles/profile-1/edit',
    );
  });

  it('says so when there are no profiles', async () => {
    fetchMock.mockResolvedValue([]);
    render(<ProfileList />);

    expect(await screen.findByText(/Du har ingen maler ennå/)).toBeInTheDocument();
  });

  it('shows the error when the profiles cannot be loaded', async () => {
    fetchMock.mockRejectedValue(new Error('Du er logget ut. Logg inn på nytt og prøv igjen.'));
    render(<ProfileList />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Du er logget ut');
  });

  it('asks before deleting, then removes the profile from the list', async () => {
    fetchMock.mockResolvedValue([profile]);
    deleteMock.mockResolvedValue();
    const user = userEvent.setup();
    render(<ProfileList />);

    await user.click(await screen.findByRole('button', { name: 'Slett Profil A' }));
    expect(screen.getByRole('dialog', { name: 'Slette malen «Profil A»?' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Slett' }));

    expect(deleteMock).toHaveBeenCalledWith('profile-1');
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Profil A' })).not.toBeInTheDocument(),
    );
  });

  it('keeps the dialog open with the error when deleting fails', async () => {
    fetchMock.mockResolvedValue([profile]);
    deleteMock.mockRejectedValue(new Error('Noe gikk galt. Prøv igjen.'));
    const user = userEvent.setup();
    render(<ProfileList />);

    await user.click(await screen.findByRole('button', { name: 'Slett Profil A' }));
    await user.click(screen.getByRole('button', { name: 'Slett' }));

    expect(await screen.findByText('Noe gikk galt. Prøv igjen.')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeVisible();
  });
});
