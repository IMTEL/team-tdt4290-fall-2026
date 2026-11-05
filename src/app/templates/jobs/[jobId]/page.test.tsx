import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { deleteJobTemplate, fetchJobTemplate } from '@/components/templates/workplaceApi';
import JobTemplatePage, { generateMetadata } from './page';

const { notFound, push } = vi.hoisted(() => ({ notFound: vi.fn(), push: vi.fn() }));

vi.mock('next/navigation', () => ({ notFound, useRouter: () => ({ push }) }));
vi.mock('@/components/templates/workplaceApi', () => ({
  fetchJobTemplate: vi.fn(),
  deleteJobTemplate: vi.fn(),
}));

const fetchJobTemplateMock = vi.mocked(fetchJobTemplate);
const deleteJobTemplateMock = vi.mocked(deleteJobTemplate);

const own = {
  id: 'job-1',
  title: 'Lagermedarbeider natt',
  industry: 'Logistikk',
  sector: 'privat' as const,
  description: 'Plukk og pakking om natten.',
  tasks: ['Plukking', 'Truck'],
  jobDescription: 'Jobber på et stort lager om natten.',
};

async function renderPage(jobId: string) {
  render(await JobTemplatePage({ params: Promise.resolve({ jobId }) }));
}

afterEach(() => {
  vi.resetAllMocks();
});

describe('/templates/jobs/[jobId]', () => {
  it('shows the job template, which comes with the app and has no edit or delete', async () => {
    await renderPage('helsefagarbeider');

    expect(screen.getByRole('heading', { level: 1, name: 'Helsefagarbeider' })).toBeVisible();
    expect(screen.getByText('Følger med appen')).toBeVisible();
    expect(screen.getByText(/Pleie og omsorg på sykehjem/)).toBeVisible();
    expect(screen.getByText('Offentlig')).toBeVisible();
    expect(screen.getByText('Turnus')).toBeVisible();
    expect(screen.getByText(/stell, måltider og medisiner/)).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Rediger' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Slett/ })).not.toBeInTheDocument();
    expect(fetchJobTemplateMock).not.toHaveBeenCalled();
  });

  it('links to its industry and back to the templates', async () => {
    await renderPage('helsefagarbeider');

    const industry = screen.getByText('Bransje').closest('div');
    expect(within(industry!).getByRole('link', { name: 'Helse og omsorg' })).toHaveAttribute(
      'href',
      '/templates/industries/helse-og-omsorg',
    );
    expect(screen.getByRole('link', { name: 'Tilbake' })).toHaveAttribute(
      'href',
      '/templates',
    );
  });

  it('shows the counsellor’s own job template with buttons to edit and delete it', async () => {
    fetchJobTemplateMock.mockResolvedValue(own);
    await renderPage('job-1');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Lagermedarbeider natt' }),
    ).toBeVisible();
    expect(screen.getByText('Egen mal')).toBeVisible();
    expect(screen.getByText('Truck')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Logistikk' })).toHaveAttribute(
      'href',
      '/templates/industries/logistikk',
    );
    expect(screen.getByRole('link', { name: 'Rediger' })).toHaveAttribute(
      'href',
      '/templates/jobs/job-1/edit',
    );
  });

  it('deletes the counsellor’s own job template after asking, then opens the templates', async () => {
    fetchJobTemplateMock.mockResolvedValue(own);
    deleteJobTemplateMock.mockResolvedValue();
    await renderPage('job-1');

    await userEvent.click(
      await screen.findByRole('button', { name: 'Slett Lagermedarbeider natt' }),
    );
    const dialog = screen.getByRole('dialog', {
      name: 'Slette stillingsmalen «Lagermedarbeider natt»?',
    });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Slett' }));

    expect(deleteJobTemplateMock).toHaveBeenCalledWith('job-1');
    await waitFor(() => expect(push).toHaveBeenCalledWith('/templates'));
  });

  it('is not found for a job that does not exist', async () => {
    fetchJobTemplateMock.mockResolvedValue(null);
    await renderPage('finnes-ikke');

    await waitFor(() => expect(notFound).toHaveBeenCalled());
  });

  it('is titled after the job', async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ jobId: 'helsefagarbeider' }),
    });
    expect(metadata.title).toBe('Helsefagarbeider');
  });
});
