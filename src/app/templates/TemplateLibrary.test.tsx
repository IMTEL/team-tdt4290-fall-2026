import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchSavedTemplates } from '@/app/configure/api';
import type { JobSeekerProfile } from '@/domain/jobSeekerProfile';
import { fetchProfiles } from '@/components/profiles/api';
import { TemplateLibrary } from './TemplateLibrary';

vi.mock('@/components/profiles/api', () => ({ fetchProfiles: vi.fn() }));
vi.mock('@/app/configure/api', () => ({ fetchSavedTemplates: vi.fn() }));

const fetchProfilesMock = vi.mocked(fetchProfiles);
const fetchSavedTemplatesMock = vi.mocked(fetchSavedTemplates);

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

const savedTemplate = {
  id: 'saved-1',
  agentType: 'interviewer',
  title: 'Min butikksjef',
  description: 'Lagret av meg.',
  focus: ['Service'],
  persona: 'Hen er butikksjef.',
};

function section(name: string): HTMLElement {
  const heading = screen.getByRole('heading', { level: 2, name });
  const region = heading.closest('.MuiAccordion-root');
  if (!region) throw new Error(`No accordion for ${name}`);
  return region as HTMLElement;
}

afterEach(() => {
  fetchProfilesMock.mockReset();
  fetchSavedTemplatesMock.mockReset();
  localStorage.clear();
});

describe('TemplateLibrary', () => {
  it('lists industries and jobs, and folds a group shut', async () => {
    fetchProfilesMock.mockReturnValue(new Promise(() => {}));
    fetchSavedTemplatesMock.mockResolvedValue([]);
    const user = userEvent.setup();
    render(<TemplateLibrary />);

    const industries = section('Bransjemaler');
    expect(
      within(industries).getByRole('heading', { level: 3, name: 'Helse og omsorg' }),
    ).toBeVisible();
    expect(within(industries).getByText('Helsefagarbeider.')).toBeVisible();

    const jobs = section('Stillingsmaler');
    expect(
      await within(jobs).findByRole('heading', { level: 3, name: 'Helsefagarbeider' }),
    ).toBeVisible();
    expect(within(jobs).getByText('Helse og omsorg · Offentlig')).toBeVisible();

    // Every card opens the template's page.
    expect(within(industries).getByRole('link', { name: /^Helse og omsorg/ })).toHaveAttribute(
      'href',
      '/templates/industries/helse-og-omsorg',
    );
    expect(within(jobs).getByRole('link', { name: /^Helsefagarbeider/ })).toHaveAttribute(
      'href',
      '/templates/jobs/helsefagarbeider',
    );

    const toggle = screen.getByRole('button', { name: 'Bransjemaler' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(
      within(industries).queryByRole('heading', { level: 3, name: 'Helse og omsorg' }),
    ).toBeNull();
  });

  it('keeps a closed group closed after the page is opened again', async () => {
    fetchProfilesMock.mockResolvedValue([]);
    fetchSavedTemplatesMock.mockResolvedValue([]);
    const user = userEvent.setup();
    const view = render(<TemplateLibrary />);

    await within(section('Stillingsmaler')).findByRole('heading', {
      level: 3,
      name: 'Helsefagarbeider',
    });
    await user.click(screen.getByRole('button', { name: 'Stillingsmaler' }));
    view.unmount();
    render(<TemplateLibrary />);

    expect(screen.getByRole('button', { name: 'Stillingsmaler' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.getByRole('button', { name: 'Bransjemaler' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('shows each profile as a card that opens it, and a card for a new one', async () => {
    fetchProfilesMock.mockResolvedValue([profile]);
    fetchSavedTemplatesMock.mockResolvedValue([]);
    render(<TemplateLibrary />);

    const profiles = section('Jobbsøkermaler');
    expect(await within(profiles).findByRole('link', { name: /Ny jobbsøkermal/ })).toHaveAttribute(
      'href',
      '/profiles/new',
    );
    const card = await within(profiles).findByRole('link', { name: /Profil A/ });
    expect(card).toHaveAttribute('href', '/profiles/profile-1');
    expect(card).toHaveTextContent('25–29 år · Litt (under 1 år)');
    expect(card).toHaveTextContent('Fortelle om seg selv.');
    expect(card).not.toHaveTextContent('Hemmelig');
  });

  it('says when the profiles could not be loaded', async () => {
    fetchProfilesMock.mockRejectedValue(new Error('Noe gikk galt. Prøv igjen.'));
    fetchSavedTemplatesMock.mockResolvedValue([]);
    render(<TemplateLibrary />);

    expect(await screen.findByText('Noe gikk galt. Prøv igjen.')).toBeVisible();
    expect(screen.queryByRole('link', { name: /Ny jobbsøkermal/ })).not.toBeInTheDocument();
  });

  it('shows a placeholder for a new industry', () => {
    fetchProfilesMock.mockResolvedValue([]);
    fetchSavedTemplatesMock.mockResolvedValue([]);
    render(<TemplateLibrary />);

    const industries = section('Bransjemaler');
    expect(
      within(industries).getByRole('heading', { level: 3, name: 'Ny bransjemal' }),
    ).toBeVisible();
    expect(within(industries).getByText('Kommer snart')).toBeVisible();
    expect(
      within(industries).queryByRole('link', { name: /Ny bransjemal/ }),
    ).not.toBeInTheDocument();
  });

  it('links Ny stillingsmal to creating a template and shows saved ones under Dine maler', async () => {
    fetchProfilesMock.mockResolvedValue([]);
    fetchSavedTemplatesMock.mockResolvedValue([savedTemplate]);
    render(<TemplateLibrary />);

    const jobs = section('Stillingsmaler');
    expect(await within(jobs).findByText('Dine maler')).toBeVisible();
    expect(within(jobs).getByText('Ferdige maler')).toBeVisible();
    expect(within(jobs).getByRole('link', { name: /Ny stillingsmal/ })).toHaveAttribute(
      'href',
      '/create-template?agentType=interviewer&returnTo=%2Ftemplates',
    );
    const saved = within(jobs).getByRole('link', { name: /Min butikksjef/ });
    expect(saved).toHaveAttribute('href', '/templates/saved-1/edit');
    expect(saved).toHaveTextContent('Service');
    expect(saved).toHaveTextContent('Lagret av meg.');
  });

  it('still shows built-in jobs when saved templates cannot be loaded', async () => {
    fetchProfilesMock.mockResolvedValue([]);
    fetchSavedTemplatesMock.mockRejectedValue(new Error('down'));
    render(<TemplateLibrary />);

    const jobs = section('Stillingsmaler');
    expect(await within(jobs).findByText('Noe gikk galt. Prøv igjen.')).toBeVisible();
    expect(within(jobs).getByText('Ferdige maler')).toBeVisible();
    expect(within(jobs).getByRole('heading', { level: 3, name: 'Helsefagarbeider' })).toBeVisible();
    expect(within(jobs).getByRole('link', { name: /Ny stillingsmal/ })).toBeVisible();
  });

  it('shows Mal laget when opened after creating a template', async () => {
    sessionStorage.setItem('kfi-templates-flash', 'mal-laget');
    fetchProfilesMock.mockResolvedValue([]);
    fetchSavedTemplatesMock.mockResolvedValue([]);
    render(<TemplateLibrary />);

    expect(await screen.findByText('Mal laget')).toBeVisible();
    expect(sessionStorage.getItem('kfi-templates-flash')).toBeNull();
  });

  it('shows Mal lagret when opened after editing a template', async () => {
    sessionStorage.setItem('kfi-templates-flash', 'mal-lagret');
    fetchProfilesMock.mockResolvedValue([]);
    fetchSavedTemplatesMock.mockResolvedValue([]);
    render(<TemplateLibrary />);

    expect(await screen.findByText('Mal lagret')).toBeVisible();
  });
});
