import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchJobTemplates } from '@/components/templates/workplaceApi';
import IndustryTemplatePage, { generateMetadata } from './page';

const { notFound } = vi.hoisted(() => ({ notFound: vi.fn() }));

vi.mock('next/navigation', () => ({ notFound }));
vi.mock('@/components/templates/workplaceApi', () => ({ fetchJobTemplates: vi.fn() }));

const fetchJobTemplatesMock = vi.mocked(fetchJobTemplates);

const ownJob = {
  id: 'job-1',
  title: 'Kassemedarbeider',
  industry: 'Varehandel',
  sector: 'privat' as const,
  description: 'Kasse i en dagligvarebutikk.',
  tasks: ['Kasse'],
  jobDescription: 'Sitter i kassen.',
};

async function renderPage(industry: string) {
  render(await IndustryTemplatePage({ params: Promise.resolve({ industry }) }));
}

beforeEach(() => {
  fetchJobTemplatesMock.mockResolvedValue([]);
});

afterEach(() => {
  vi.resetAllMocks();
});

describe('/templates/industries/[industry]', () => {
  it('shows the industry with links to its job templates, and no edit or delete', async () => {
    await renderPage('varehandel');

    expect(screen.getByRole('heading', { level: 1, name: 'Varehandel' })).toBeVisible();
    expect(screen.getByText('Følger med appen')).toBeVisible();
    expect(screen.getByText('Privat')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Butikkmedarbeider' })).toHaveAttribute(
      'href',
      '/templates/jobs/butikkmedarbeider',
    );
    expect(screen.getByText('Kundeservice')).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Rediger' })).not.toBeInTheDocument();
  });

  it('lists the counsellor’s own job templates in a built-in industry', async () => {
    fetchJobTemplatesMock.mockResolvedValue([ownJob]);
    await renderPage('varehandel');

    expect(await screen.findByRole('link', { name: 'Kassemedarbeider' })).toHaveAttribute(
      'href',
      '/templates/jobs/job-1',
    );
  });

  it('shows an industry only the counsellor’s own job templates name', async () => {
    fetchJobTemplatesMock.mockResolvedValue([{ ...ownJob, industry: 'Logistikk' }]);
    await renderPage('logistikk');

    expect(await screen.findByRole('heading', { level: 1, name: 'Logistikk' })).toBeVisible();
    expect(screen.getByText('Egen mal')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Kassemedarbeider' })).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Rediger' })).not.toBeInTheDocument();
  });

  it('also finds the industry from an encoded address', async () => {
    await renderPage(encodeURIComponent('helse-og-omsorg'));

    expect(screen.getByRole('heading', { level: 1, name: 'Helse og omsorg' })).toBeVisible();
  });

  it('is not found for an industry that does not exist', async () => {
    await renderPage('finnes-ikke');

    await waitFor(() => expect(notFound).toHaveBeenCalled());
  });

  it('is titled after the industry', async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ industry: 'varehandel' }),
    });
    expect(metadata.title).toBe('Varehandel');
  });
});
