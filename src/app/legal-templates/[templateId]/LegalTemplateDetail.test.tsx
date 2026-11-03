import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { deleteLegalTemplate, fetchLegalTemplate } from '@/components/legalTemplates/api';
import { LegalTemplateDetail } from './LegalTemplateDetail';

const { notFound, push } = vi.hoisted(() => ({ notFound: vi.fn(), push: vi.fn() }));

vi.mock('next/navigation', () => ({ notFound, useRouter: () => ({ push }) }));
vi.mock('@/components/legalTemplates/api', () => ({
  fetchLegalTemplate: vi.fn(),
  deleteLegalTemplate: vi.fn(),
}));

const fetchLegalTemplateMock = vi.mocked(fetchLegalTemplate);
const deleteLegalTemplateMock = vi.mocked(deleteLegalTemplate);

const own = {
  id: 'legal-1',
  title: 'Arbeidsmiljøloven § 9-3',
  description: 'Helseopplysninger',
  text: 'Ikke spør om helse.\nUnntak: det stillingen krever.',
  builtIn: false,
};

afterEach(() => {
  vi.resetAllMocks();
});

describe('LegalTemplateDetail', () => {
  it('shows the counsellor’s own template with buttons to edit and delete it', async () => {
    fetchLegalTemplateMock.mockResolvedValue(own);
    render(<LegalTemplateDetail templateId="legal-1" />);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Arbeidsmiljøloven § 9-3' }),
    ).toBeVisible();
    expect(screen.getByText('Eget lovverk')).toBeVisible();
    expect(screen.getByText('Helseopplysninger')).toBeVisible();
    expect(
      screen.getByText(/Ikke spør om helse\.\s+Unntak: det stillingen krever\./),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'Rediger' })).toHaveAttribute(
      'href',
      '/legal-templates/legal-1/edit',
    );
    expect(screen.getByRole('button', { name: 'Slett Arbeidsmiljøloven § 9-3' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Tilbake til malene' })).toHaveAttribute(
      'href',
      '/templates?seksjon=lovverk#lovverk',
    );
  });

  it('shows a built-in template without loading it, and without edit or delete', () => {
    render(<LegalTemplateDetail templateId="builtin-legal-hiring-rights" />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Rettigheter i ansettelsesprosessen' }),
    ).toBeVisible();
    expect(screen.getByText('Følger med appen')).toBeVisible();
    expect(screen.getByText(/Likestillings- og diskrimineringsloven § 30/)).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Rediger' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Slett/ })).not.toBeInTheDocument();
    expect(fetchLegalTemplateMock).not.toHaveBeenCalled();
  });

  it('goes back to the templates once the template is deleted', async () => {
    fetchLegalTemplateMock.mockResolvedValue(own);
    deleteLegalTemplateMock.mockResolvedValue();
    const user = userEvent.setup();
    render(<LegalTemplateDetail templateId="legal-1" />);

    await user.click(await screen.findByRole('button', { name: 'Slett Arbeidsmiljøloven § 9-3' }));
    await user.click(screen.getByRole('button', { name: 'Slett' }));

    expect(deleteLegalTemplateMock).toHaveBeenCalledWith('legal-1');
    await waitFor(() => expect(push).toHaveBeenCalledWith('/templates'));
  });

  it('says so when the template does not exist', async () => {
    fetchLegalTemplateMock.mockResolvedValue(null);
    render(<LegalTemplateDetail templateId="missing" />);

    await waitFor(() => expect(notFound).toHaveBeenCalled());
  });

  it('shows the error when the template cannot be loaded', async () => {
    fetchLegalTemplateMock.mockRejectedValue(new Error('Noe gikk galt. Prøv igjen.'));
    render(<LegalTemplateDetail templateId="legal-1" />);

    expect(await screen.findByText('Noe gikk galt. Prøv igjen.')).toBeVisible();
  });
});
