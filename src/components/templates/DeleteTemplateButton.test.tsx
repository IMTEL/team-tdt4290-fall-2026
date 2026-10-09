import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { deleteTemplate } from './api';
import { DeleteTemplateButton } from './DeleteTemplateButton';

vi.mock('./api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api')>()),
  deleteTemplate: vi.fn(),
}));
const deleteMock = vi.mocked(deleteTemplate);

const template = {
  id: 'template-1',
  title: 'Butikksjef',
  description: 'Vennlig.',
  focus: [],
  persona: 'Hen er butikksjef.',
};

function setup() {
  const user = userEvent.setup();
  const onDeleted = vi.fn();
  render(<DeleteTemplateButton template={template} onDeleted={onDeleted} />);
  return { user, onDeleted };
}

afterEach(() => {
  deleteMock.mockReset();
});

describe('DeleteTemplateButton', () => {
  it('asks first, then deletes the template', async () => {
    deleteMock.mockResolvedValue();
    const { user, onDeleted } = setup();

    await user.click(screen.getByRole('button', { name: 'Slett Butikksjef' }));
    expect(screen.getByRole('dialog', { name: 'Slette malen «Butikksjef»?' })).toBeVisible();
    expect(deleteMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Slett' }));

    expect(deleteMock).toHaveBeenCalledWith('template-1');
    expect(onDeleted).toHaveBeenCalledWith('template-1');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('deletes nothing when the user cancels', async () => {
    const { user, onDeleted } = setup();

    await user.click(screen.getByRole('button', { name: 'Slett Butikksjef' }));
    await user.click(screen.getByRole('button', { name: 'Avbryt' }));

    expect(deleteMock).not.toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it('shows the error and stays open when deleting fails', async () => {
    deleteMock.mockRejectedValue(new Error('Noe gikk galt. Prøv igjen.'));
    const { user, onDeleted } = setup();

    await user.click(screen.getByRole('button', { name: 'Slett Butikksjef' }));
    await user.click(screen.getByRole('button', { name: 'Slett' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Noe gikk galt');
    expect(screen.getByRole('dialog')).toBeVisible();
    expect(onDeleted).not.toHaveBeenCalled();
  });
});
