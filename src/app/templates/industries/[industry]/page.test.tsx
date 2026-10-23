import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import IndustryTemplatePage, { generateMetadata } from './page';

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));

async function renderPage(industry: string) {
  render(await IndustryTemplatePage({ params: Promise.resolve({ industry }) }));
}

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

  it('also finds the industry from an encoded address', async () => {
    await renderPage(encodeURIComponent('helse-og-omsorg'));

    expect(screen.getByRole('heading', { level: 1, name: 'Helse og omsorg' })).toBeVisible();
  });

  it('is not found for an industry that does not exist', async () => {
    await expect(renderPage('finnes-ikke')).rejects.toThrow('NEXT_NOT_FOUND');
    await expect(renderPage('%E0%A4%A')).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('is titled after the industry', async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ industry: 'varehandel' }),
    });
    expect(metadata.title).toBe('Varehandel');
  });
});
