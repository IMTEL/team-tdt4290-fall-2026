import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { JobSeekerProfile } from '@/domain/jobSeekerProfile';
import { fetchLegalTemplates } from '@/components/legalTemplates/api';
import { fetchProfiles } from '@/components/profiles/api';
import { TemplateLibrary } from './TemplateLibrary';

vi.mock('@/components/profiles/api', () => ({ fetchProfiles: vi.fn() }));
vi.mock('@/components/legalTemplates/api', () => ({ fetchLegalTemplates: vi.fn() }));

const fetchProfilesMock = vi.mocked(fetchProfiles);
const fetchLegalTemplatesMock = vi.mocked(fetchLegalTemplates);

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

beforeEach(() => {
  fetchLegalTemplatesMock.mockResolvedValue([]);
});

afterEach(() => {
  fetchProfilesMock.mockReset();
  fetchLegalTemplatesMock.mockReset();
  localStorage.clear();
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

  it('keeps a closed group closed after the page is opened again', async () => {
    fetchProfilesMock.mockResolvedValue([]);
    const user = userEvent.setup();
    const view = render(<TemplateLibrary />);

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
    render(<TemplateLibrary />);

    const profiles = section('Jobbsøkermaler');
    expect(await within(profiles).findByRole('link', { name: /Ny jobbsøkermal/ })).toHaveAttribute(
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
    expect(screen.queryByRole('link', { name: /Ny jobbsøkermal/ })).not.toBeInTheDocument();
  });

  it('shows a placeholder for a new industry', () => {
    fetchProfilesMock.mockResolvedValue([]);
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

  it('links Ny stillingsmal to creating a template', () => {
    fetchProfilesMock.mockResolvedValue([]);
    render(<TemplateLibrary />);

    const jobs = section('Stillingsmaler');
    expect(within(jobs).getByRole('link', { name: /Ny stillingsmal/ })).toHaveAttribute(
      'href',
      '/create-template?agentType=interviewer',
    );
  });

  it('shows the built-in and the counsellor’s own legal templates as cards that open them', async () => {
    fetchProfilesMock.mockResolvedValue([]);
    fetchLegalTemplatesMock.mockResolvedValue([
      {
        id: 'legal-1',
        title: 'Arbeidsmiljøloven § 9-3',
        description: 'Helseopplysninger',
        text: 'Ikke spør om helse.',
        builtIn: false,
      },
    ]);
    render(<TemplateLibrary />);

    const legal = section('Lovverk');
    expect(within(legal).getByRole('link', { name: /Nytt lovverk/ })).toHaveAttribute(
      'href',
      '/legal-templates/new',
    );
    const builtIn = within(legal).getByRole('link', { name: /Rettigheter i ansettelsesprosessen/ });
    expect(builtIn).toHaveAttribute('href', '/legal-templates/builtin-legal-hiring-rights');
    expect(builtIn).toHaveTextContent('Følger med appen');
    const own = await within(legal).findByRole('link', { name: /Arbeidsmiljøloven § 9-3/ });
    expect(own).toHaveAttribute('href', '/legal-templates/legal-1');
    expect(own).toHaveTextContent('Helseopplysninger.');
    expect(within(builtIn).getByText('Følger med appen')).toHaveClass('MuiChip-label');
    expect(within(own).getByText('Eget lovverk')).toHaveClass('MuiChip-label');
  });

  it('still shows the built-in legal templates when the counsellor’s own cannot be loaded', async () => {
    fetchProfilesMock.mockResolvedValue([]);
    fetchLegalTemplatesMock.mockRejectedValue(new Error('Fant ikke lovverket.'));
    render(<TemplateLibrary />);

    const legal = section('Lovverk');
    expect(await within(legal).findByText('Fant ikke lovverket.')).toBeVisible();
    expect(
      within(legal).getByRole('link', { name: /Rettigheter i ansettelsesprosessen/ }),
    ).toBeVisible();
  });
});
