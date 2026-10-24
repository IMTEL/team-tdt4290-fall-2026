import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { deleteProfile, fetchProfile } from '@/components/profiles/api';
import type { JobSeekerProfile } from '@/domain/jobSeekerProfile';
import { ProfileDetail } from './ProfileDetail';

const { notFound, push } = vi.hoisted(() => ({ notFound: vi.fn(), push: vi.fn() }));

vi.mock('next/navigation', () => ({ notFound, useRouter: () => ({ push }) }));
vi.mock('@/components/profiles/api', () => ({
  fetchProfile: vi.fn(),
  deleteProfile: vi.fn(),
}));

const fetchProfileMock = vi.mocked(fetchProfile);
const deleteProfileMock = vi.mocked(deleteProfile);

const profile: JobSeekerProfile = {
  id: 'profile-1',
  label: 'Profil A',
  ageRange: '25-29',
  experienceLevel: 'some',
  workExperience: 'Sommerjobb i butikk',
  education: '',
  languages: ['Norsk B1', 'Arabisk'],
  practiceAreas: ['Mestre nervøsitet'],
  notes: 'Hemmelig for intervjueren',
};

afterEach(() => {
  vi.resetAllMocks();
});

describe('ProfileDetail', () => {
  it('shows everything the template says, with buttons to edit and delete it', async () => {
    fetchProfileMock.mockResolvedValue(profile);
    render(<ProfileDetail profileId="profile-1" />);

    expect(await screen.findByRole('heading', { level: 1, name: 'Profil A' })).toBeVisible();
    expect(screen.getByText('Egen mal')).toBeVisible();
    expect(screen.getByText('25–29 år')).toBeVisible();
    expect(screen.getByText('Noe (1–5 år)')).toBeVisible();
    expect(screen.getByText('Sommerjobb i butikk')).toBeVisible();
    expect(screen.getByText('Arabisk')).toBeVisible();
    expect(screen.getByText('Mestre nervøsitet')).toBeVisible();
    // Only the counsellor sees this page, so their notes are shown.
    expect(screen.getByText('Hemmelig for intervjueren')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Rediger' })).toHaveAttribute(
      'href',
      '/profiles/profile-1/edit',
    );
    expect(screen.getByRole('link', { name: 'Tilbake til malene' })).toHaveAttribute(
      'href',
      '/templates',
    );
  });

  it('shows a dash for what the template leaves out', async () => {
    fetchProfileMock.mockResolvedValue({
      ...profile,
      ageRange: null,
      experienceLevel: null,
      workExperience: '',
      languages: [],
      practiceAreas: [],
      notes: '',
    });
    render(<ProfileDetail profileId="profile-1" />);

    await screen.findByRole('heading', { level: 1, name: 'Profil A' });
    expect(screen.getAllByText('–')).toHaveLength(7);
  });

  it('goes back to the templates once the template is deleted', async () => {
    fetchProfileMock.mockResolvedValue(profile);
    deleteProfileMock.mockResolvedValue();
    const user = userEvent.setup();
    render(<ProfileDetail profileId="profile-1" />);

    await user.click(await screen.findByRole('button', { name: 'Slett Profil A' }));
    await user.click(screen.getByRole('button', { name: 'Slett' }));

    expect(deleteProfileMock).toHaveBeenCalledWith('profile-1');
    await waitFor(() => expect(push).toHaveBeenCalledWith('/templates'));
  });

  it('says so when the template does not exist', async () => {
    fetchProfileMock.mockResolvedValue(null);
    render(<ProfileDetail profileId="missing" />);

    await waitFor(() => expect(notFound).toHaveBeenCalled());
  });

  it('shows the error when the template cannot be loaded', async () => {
    fetchProfileMock.mockRejectedValue(new Error('Noe gikk galt. Prøv igjen.'));
    render(<ProfileDetail profileId="profile-1" />);

    expect(await screen.findByText('Noe gikk galt. Prøv igjen.')).toBeVisible();
  });
});
