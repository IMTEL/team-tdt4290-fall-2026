import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { notFound } from 'next/navigation';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchProfile, updateProfile } from '@/components/profiles/api';
import { EditProfile } from './EditProfile';

vi.mock('next/navigation', () => ({ notFound: vi.fn() }));
vi.mock('@/components/profiles/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/profiles/api')>()),
  fetchProfile: vi.fn(),
  updateProfile: vi.fn(),
}));
const fetchMock = vi.mocked(fetchProfile);
const updateMock = vi.mocked(updateProfile);

const profile = {
  id: 'profile-1',
  label: 'Profil A',
  ageRange: null,
  experienceLevel: null,
  workExperience: '',
  education: '',
  languages: [],
  practiceAreas: [],
  notes: '',
};

afterEach(() => {
  fetchMock.mockReset();
  updateMock.mockReset();
  vi.mocked(notFound).mockReset();
});

describe('EditProfile', () => {
  it('loads the profile into the form and saves the changes to the same profile', async () => {
    fetchMock.mockResolvedValue(profile);
    updateMock.mockResolvedValue();
    const user = userEvent.setup();
    render(<EditProfile profileId="profile-1" />);

    const label = await screen.findByRole('textbox', { name: /Navn på profilen/ });
    await user.type(label, ' ny');
    await user.click(screen.getByRole('button', { name: 'Lagre endringene' }));

    const { id, ...fields } = profile;
    expect(updateMock).toHaveBeenCalledWith(id, { ...fields, label: 'Profil A ny' });
  });

  it('shows the not-found page when the counsellor has no such profile', async () => {
    fetchMock.mockResolvedValue(null);
    render(<EditProfile profileId="profile-1" />);

    await vi.waitFor(() => expect(notFound).toHaveBeenCalled());
  });

  it('shows the error when the profile cannot be loaded', async () => {
    fetchMock.mockRejectedValue(new Error('Du er logget ut. Logg inn på nytt og prøv igjen.'));
    render(<EditProfile profileId="profile-1" />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Du er logget ut');
  });
});
