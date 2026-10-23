import { render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import JobTemplatePage, { generateMetadata } from './page';

const notFound = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
);

vi.mock('next/navigation', () => ({ notFound }));

async function renderPage(jobId: string) {
  render(await JobTemplatePage({ params: Promise.resolve({ jobId }) }));
}

afterEach(() => {
  notFound.mockClear();
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
  });

  it('links to its industry and back to the templates', async () => {
    await renderPage('helsefagarbeider');

    const industry = screen.getByText('Bransje').closest('div');
    expect(within(industry!).getByRole('link', { name: 'Helse og omsorg' })).toHaveAttribute(
      'href',
      '/templates/industries/helse-og-omsorg',
    );
    expect(screen.getByRole('link', { name: 'Tilbake til malene' })).toHaveAttribute(
      'href',
      '/templates',
    );
  });

  it('is not found for a job that does not exist', async () => {
    await expect(renderPage('finnes-ikke')).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('is titled after the job', async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ jobId: 'helsefagarbeider' }),
    });
    expect(metadata.title).toBe('Helsefagarbeider');
  });
});
