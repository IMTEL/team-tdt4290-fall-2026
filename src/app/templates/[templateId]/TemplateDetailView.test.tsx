import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { deleteTemplate, fetchTemplate } from '@/components/templates/api';
import type { AgentTemplate } from '@/data/templates';
import { TemplateDetailView } from './TemplateDetailView';

const { notFound, push } = vi.hoisted(() => ({ notFound: vi.fn(), push: vi.fn() }));

vi.mock('next/navigation', () => ({ notFound, useRouter: () => ({ push }) }));
vi.mock('@/components/templates/api', () => ({
  fetchTemplate: vi.fn(),
  deleteTemplate: vi.fn(),
}));

const fetchTemplateMock = vi.mocked(fetchTemplate);
const deleteTemplateMock = vi.mocked(deleteTemplate);

const saved: AgentTemplate = {
  id: 'saved-1',
  agentType: 'interviewer',
  title: 'Min butikksjef',
  description: 'Travel, men vennlig.',
  focus: ['Service', 'Samarbeid'],
  persona: 'Intervjueren er butikksjef.\nSpør om service.',
};

afterEach(() => {
  vi.resetAllMocks();
});

describe('TemplateDetailView', () => {
  it('shows the counsellor’s own template with buttons to edit and delete it', async () => {
    fetchTemplateMock.mockResolvedValue(saved);
    render(<TemplateDetailView templateId="saved-1" />);

    expect(await screen.findByRole('heading', { level: 1, name: 'Min butikksjef' })).toBeVisible();
    expect(screen.getByText('Egen mal')).toBeVisible();
    expect(screen.getByText('Travel, men vennlig.')).toBeVisible();
    expect(screen.getByText('Intervjuer')).toBeVisible();
    expect(screen.getByText('Samarbeid')).toBeVisible();
    expect(screen.getByText(/Intervjueren er butikksjef\.\s+Spør om service\./)).toBeVisible();
    expect(screen.getByRole('link', { name: 'Rediger' })).toHaveAttribute(
      'href',
      '/templates/saved-1/edit',
    );
    expect(screen.getByRole('button', { name: 'Slett Min butikksjef' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Tilbake til malene' })).toHaveAttribute(
      'href',
      '/templates',
    );
  });

  it('shows a built-in template without loading it, and without edit or delete', () => {
    render(<TemplateDetailView templateId="teamleder" />);

    expect(screen.getByRole('heading', { level: 1, name: 'Teamleder' })).toBeVisible();
    expect(screen.getByText('Følger med appen')).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Rediger' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Slett/ })).not.toBeInTheDocument();
    expect(fetchTemplateMock).not.toHaveBeenCalled();
  });

  it('goes back to the templates once the template is deleted', async () => {
    fetchTemplateMock.mockResolvedValue(saved);
    deleteTemplateMock.mockResolvedValue();
    const user = userEvent.setup();
    render(<TemplateDetailView templateId="saved-1" />);

    await user.click(await screen.findByRole('button', { name: 'Slett Min butikksjef' }));
    await user.click(screen.getByRole('button', { name: 'Slett' }));

    expect(deleteTemplateMock).toHaveBeenCalledWith('saved-1');
    await waitFor(() => expect(push).toHaveBeenCalledWith('/templates'));
  });

  it('says so when the template does not exist', async () => {
    fetchTemplateMock.mockResolvedValue(null);
    render(<TemplateDetailView templateId="missing" />);

    await waitFor(() => expect(notFound).toHaveBeenCalled());
  });

  it('shows the error when the template cannot be loaded', async () => {
    fetchTemplateMock.mockRejectedValue(new Error('Noe gikk galt. Prøv igjen.'));
    render(<TemplateDetailView templateId="saved-1" />);

    expect(await screen.findByText('Noe gikk galt. Prøv igjen.')).toBeVisible();
  });
});
