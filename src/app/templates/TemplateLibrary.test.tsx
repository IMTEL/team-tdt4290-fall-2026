import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchSavedTemplates } from '@/app/configure/api';
import type { JobSeekerProfile } from '@/domain/jobSeekerProfile';
import { fetchLegalTemplates } from '@/components/legalTemplates/api';
import { fetchProfiles } from '@/components/profiles/api';
import { fetchIndustryTemplates, fetchJobTemplates } from '@/components/templates/workplaceApi';
import { TemplateLibrary } from './TemplateLibrary';

vi.mock('@/components/profiles/api', () => ({ fetchProfiles: vi.fn() }));
vi.mock('@/components/legalTemplates/api', () => ({ fetchLegalTemplates: vi.fn() }));
vi.mock('@/app/configure/api', () => ({ fetchSavedTemplates: vi.fn() }));
vi.mock('@/components/templates/workplaceApi', () => ({
  fetchJobTemplates: vi.fn(),
  fetchIndustryTemplates: vi.fn(),
}));

const fetchProfilesMock = vi.mocked(fetchProfiles);
const fetchLegalTemplatesMock = vi.mocked(fetchLegalTemplates);
const fetchSavedTemplatesMock = vi.mocked(fetchSavedTemplates);
const fetchJobTemplatesMock = vi.mocked(fetchJobTemplates);
const fetchIndustryTemplatesMock = vi.mocked(fetchIndustryTemplates);
const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;

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

beforeEach(() => {
  fetchLegalTemplatesMock.mockResolvedValue([]);
  fetchSavedTemplatesMock.mockResolvedValue([]);
  fetchJobTemplatesMock.mockResolvedValue([]);
  fetchIndustryTemplatesMock.mockResolvedValue([]);
});

afterEach(() => {
  fetchProfilesMock.mockReset();
  fetchLegalTemplatesMock.mockReset();
  fetchSavedTemplatesMock.mockReset();
  fetchJobTemplatesMock.mockReset();
  fetchIndustryTemplatesMock.mockReset();
  localStorage.clear();
  window.history.replaceState({}, '', '/');
  HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
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

  it('links to the forms for a new industry and a new job', () => {
    fetchProfilesMock.mockResolvedValue([]);
    render(<TemplateLibrary />);

    expect(
      within(section('Bransjemaler')).getByRole('link', { name: /Ny bransjemal/ }),
    ).toHaveAttribute('href', '/templates/industries/new');
    expect(
      within(section('Stillingsmaler')).getByRole('link', { name: /Ny stillingsmal/ }),
    ).toHaveAttribute('href', '/templates/jobs/new');
  });

  it('shows the counsellor’s own industries and jobs next to the built-in ones', async () => {
    fetchProfilesMock.mockResolvedValue([]);
    fetchIndustryTemplatesMock.mockResolvedValue([
      { id: 'industry-1', name: 'Logistikk', description: 'Lager og transport.', context: '' },
    ]);
    fetchJobTemplatesMock.mockResolvedValue([
      {
        id: 'job-1',
        title: 'Lagermedarbeider natt',
        industry: 'Logistikk',
        sector: 'privat',
        description: 'Plukk og pakking om natten.',
        tasks: [],
        jobDescription: 'Jobber på et lager om natten.',
      },
    ]);
    render(<TemplateLibrary />);

    const industry = await within(section('Bransjemaler')).findByRole('link', {
      name: /Logistikk/,
    });
    expect(industry).toHaveAttribute('href', '/templates/industries/logistikk');
    expect(within(industry).getByText('Egen mal')).toBeVisible();
    const job = within(section('Stillingsmaler')).getByRole('link', {
      name: /Lagermedarbeider natt/,
    });
    expect(job).toHaveAttribute('href', '/templates/jobs/job-1');
    expect(within(job).getByText('Egen mal')).toBeVisible();
    // The built-in ones are still there.
    expect(
      within(section('Stillingsmaler')).getByRole('heading', {
        level: 3,
        name: 'Helsefagarbeider',
      }),
    ).toBeVisible();
  });

  it('explains each kind of mal', async () => {
    fetchProfilesMock.mockResolvedValue([]);
    fetchSavedTemplatesMock.mockResolvedValue([]);
    render(<TemplateLibrary />);

    expect(
      within(section('Bransjemaler')).getByText(
        'En bransjemal samler stillinger i samme bransje, for eksempel helse og omsorg.',
      ),
    ).toBeVisible();
    expect(
      within(section('Jobbsøkermaler')).getByText(
        'En jobbsøkermal beskriver en anonym jobbsøker du øver med, uten ekte personopplysninger.',
      ),
    ).toBeVisible();

    const jobs = section('Stillingsmaler');
    expect(
      within(jobs).getByText(
        'En stillingsmal fyller inn stilling og bransje når du setter opp en intervjuer.',
      ),
    ).toBeVisible();
    expect(
      await within(jobs).findByRole('heading', { level: 3, name: 'Helsefagarbeider' }),
    ).toBeVisible();

    expect(
      within(section('Intervjuermaler')).getByText(
        'En intervjuermal styrer hvordan intervjueren snakker og hva den legger vekt på.',
      ),
    ).toBeVisible();
    expect(
      within(section('Lovverk')).getByText(
        'Lovverk er regler intervjueren skal følge, for eksempel hva den ikke skal spørre om.',
      ),
    ).toBeVisible();
  });

  it('links Ny intervjuermal to creating a template and shows saved ones under Intervjuermaler', async () => {
    fetchProfilesMock.mockResolvedValue([]);
    fetchSavedTemplatesMock.mockResolvedValue([savedTemplate]);
    render(<TemplateLibrary />);

    const interviewers = section('Intervjuermaler');
    expect(
      await within(interviewers).findByRole('link', { name: /Ny intervjuermal/ }),
    ).toHaveAttribute('href', '/create-template?agentType=interviewer&returnTo=%2Ftemplates');
    const saved = within(interviewers).getByRole('link', { name: /Min butikksjef/ });
    expect(saved).toHaveAttribute('href', '/templates/saved-1');
    expect(saved).toHaveTextContent('Service');
    expect(saved).toHaveTextContent('Lagret av meg.');
    expect(
      within(section('Stillingsmaler')).queryByRole('link', { name: /Min butikksjef/ }),
    ).toBeNull();
  });

  it('still shows built-in jobs when saved interviewer templates cannot be loaded', async () => {
    fetchProfilesMock.mockResolvedValue([]);
    fetchSavedTemplatesMock.mockRejectedValue(new Error('down'));
    render(<TemplateLibrary />);

    const interviewers = section('Intervjuermaler');
    expect(await within(interviewers).findByText('Noe gikk galt. Prøv igjen.')).toBeVisible();
    expect(within(interviewers).getByRole('link', { name: /Ny intervjuermal/ })).toBeVisible();

    const jobs = section('Stillingsmaler');
    expect(within(jobs).getByRole('heading', { level: 3, name: 'Helsefagarbeider' })).toBeVisible();
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

  it('shows Jobbsøkermal laget when opened after creating a job seeker profile', async () => {
    sessionStorage.setItem('kfi-templates-flash', 'jobbsokermal-laget');
    fetchProfilesMock.mockResolvedValue([]);
    fetchSavedTemplatesMock.mockResolvedValue([]);
    render(<TemplateLibrary />);

    expect(await screen.findByText('Jobbsøkermal laget')).toBeVisible();
  });

  it('shows the built-in and the counsellor’s own legal templates as cards that open them', async () => {
    fetchProfilesMock.mockResolvedValue([]);
    fetchLegalTemplatesMock.mockResolvedValue([
      {
        id: 'legal-1',
        title: 'Intern regel om helse',
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
    const builtIn = within(legal).getByRole('link', {
      name: /Rettigheter i ansettelsesprosessen/,
    });
    expect(builtIn).toHaveAttribute('href', '/legal-templates/builtin-legal-hiring-rights');
    expect(builtIn).toHaveTextContent('Følger med appen');
    const own = await within(legal).findByRole('link', { name: /Intern regel om helse/ });
    expect(own).toHaveAttribute('href', '/legal-templates/legal-1');
    expect(own).toHaveTextContent('Helseopplysninger.');
    expect(within(builtIn).getByText('Følger med appen')).toHaveClass('MuiChip-label');
    expect(within(own).getByText('Eget lovverk')).toHaveClass('MuiChip-label');
  });

  it('scrolls to Lovverk when the URL names that group, and leaves the others open', async () => {
    fetchProfilesMock.mockResolvedValue([]);
    window.history.replaceState({}, '', '/templates?seksjon=lovverk');
    const scrollIntoView = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
    render(<TemplateLibrary />);

    expect(await screen.findByRole('button', { name: 'Lovverk' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Bransjemaler' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(
      within(section('Lovverk')).getByRole('link', {
        name: /Rettigheter i ansettelsesprosessen/,
      }),
    ).toBeVisible();
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalled());
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
