import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { notFound } from 'next/navigation';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchTemplate, updateTemplate } from '@/components/templates/api';
import { EditTemplate } from './EditTemplate';

vi.mock('next/navigation', () => ({ notFound: vi.fn() }));
vi.mock('@/components/templates/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/templates/api')>()),
  fetchTemplate: vi.fn(),
  updateTemplate: vi.fn(),
}));
const fetchMock = vi.mocked(fetchTemplate);
const updateMock = vi.mocked(updateTemplate);

const template = {
  id: 'template-1',
  agentType: 'interviewer',
  title: 'Butikksjef',
  description: 'Vennlig.',
  focus: ['Service'],
  persona: 'Hen er butikksjef.',
};

afterEach(() => {
  fetchMock.mockReset();
  updateMock.mockReset();
  vi.mocked(notFound).mockReset();
});

describe('EditTemplate', () => {
  it('loads the template into the form and saves the changes to the same template', async () => {
    fetchMock.mockResolvedValue(template);
    updateMock.mockResolvedValue();
    const user = userEvent.setup();
    render(<EditTemplate templateId="template-1" />);

    const title = await screen.findByRole('textbox', { name: /Navn på malen/ });
    expect(title).toHaveValue('Butikksjef');

    // Pastes at the end instead of typing, which is slow enough with MUI to time out.
    await user.click(title);
    await user.keyboard('{End}');
    await user.paste(' Kari');
    await user.click(screen.getByRole('button', { name: 'Lagre endringene' }));

    const { id, ...fields } = template;
    expect(updateMock).toHaveBeenCalledWith(id, { ...fields, title: 'Butikksjef Kari' });
  });

  it('shows the not-found page when the counsellor has no such template', async () => {
    fetchMock.mockResolvedValue(null);
    render(<EditTemplate templateId="template-1" />);

    await vi.waitFor(() => expect(notFound).toHaveBeenCalled());
  });

  it('shows the error when the template cannot be loaded', async () => {
    fetchMock.mockRejectedValue(new Error('Du er logget ut. Logg inn på nytt og prøv igjen.'));
    render(<EditTemplate templateId="template-1" />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Du er logget ut');
  });
});
