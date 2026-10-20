import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { JobSeekerProfile } from '@/domain/jobSeekerProfile';
import { fetchProfiles } from '@/components/profiles/api';
import { TemplateLibrary } from './TemplateLibrary';

vi.mock('@/components/profiles/api', () => ({ fetchProfiles: vi.fn() }));

const fetchProfilesMock = vi.mocked(fetchProfiles);

const profile: JobSeekerProfile = {
  id: 'profile-1',
  label: 'Profil A',
  ageRange: '25-29',
  experienceLevel: 'little',
  workExperience: '',
  education: '',
  languages: [],
  practiceAreas: ['Fortelle om seg selv'],
  notes: 'Hemmelig',
};

function section(name: string): HTMLElement {
  const heading = screen.getByRole('heading', { level: 2, name });
  const region = heading.closest('.MuiAccordion-root');
  if (!region) throw new Error(`No accordion for ${name}`);
  return region as HTMLElement;
}

afterEach(() => {
  fetchProfilesMock.mockReset();
});

describe('TemplateLibrary', () => {
  it('lists industries and jobs, and folds a group shut', async () => {
    fetchProfilesMock.mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    render(<TemplateLibrary />);

    const industries = section('Bransjemaler');
    expect(
      within(industries).getByRole('heading', { level: 3, name: 'Helse og omsorg' }),
    ).toBeVisible();
    expect(within(industries).getByText('Helsefagarbeider.')).toBeVisible();

    const jobs = section('Stillingsmaler');
    expect(within(jobs).getByRole('heading', { level: 3, name: 'Helsefagarbeider' })).toBeVisible();
    expect(within(jobs).getByText('Helse og omsorg · Offentlig')).toBeVisible();

    const toggle = screen.getByRole('button', { name: 'Bransjemaler' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(
      within(industries).queryByRole('heading', { level: 3, name: 'Helse og omsorg' }),
    ).toBeNull();
  });

  it('shows each profile as a card that opens it, and a card for a new one', async () => {
    fetchProfilesMock.mockResolvedValue([profile]);
    render(<TemplateLibrary />);

    const profiles = section('Jobbsøkerprofiler');
    expect(await within(profiles).findByRole('link', { name: /Ny profil/ })).toHaveAttribute(
      'href',
      '/profiles/new',
    );
    const card = await within(profiles).findByRole('link', { name: /Profil A/ });
    expect(card).toHaveAttribute('href', '/profiles/profile-1/edit');
    expect(card).toHaveTextContent('25–29 år · Litt (under 1 år)');
    expect(card).toHaveTextContent('Fortelle om seg selv.');
    expect(card).not.toHaveTextContent('Hemmelig');
  });

  it('says when the profiles could not be loaded', async () => {
    fetchProfilesMock.mockRejectedValue(new Error('Noe gikk galt. Prøv igjen.'));
    render(<TemplateLibrary />);

    expect(await screen.findByText('Noe gikk galt. Prøv igjen.')).toBeVisible();
    expect(screen.queryByRole('link', { name: /Ny profil/ })).not.toBeInTheDocument();
  });

  it('shows a placeholder for a new industry and a new job', () => {
    fetchProfilesMock.mockResolvedValue([]);
    render(<TemplateLibrary />);

    for (const [group, title] of [
      ['Bransjemaler', 'Ny bransjemal'],
      ['Stillingsmaler', 'Ny stillingsmal'],
    ] as const) {
      const area = section(group);
      expect(within(area).getByRole('heading', { level: 3, name: title })).toBeVisible();
      expect(within(area).getByText('Kommer snart')).toBeVisible();
      expect(within(area).queryByRole('link', { name: new RegExp(title) })).not.toBeInTheDocument();
      expect(
        within(area).queryByRole('button', { name: new RegExp(title) }),
      ).not.toBeInTheDocument();
    }
  });
});
