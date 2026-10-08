import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { saveTemplate } from '@/components/templates/api';
import CreateTemplatePage, { metadata } from './page';

// The form has its own tests. Here we only check that the page saves a new template.
vi.mock('@/components/templates/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/templates/api')>()),
  saveTemplate: vi.fn(),
}));
const saveMock = vi.mocked(saveTemplate);

afterEach(() => {
  saveMock.mockReset();
});

describe('/create-template', () => {
  it('saves the form as a new template', async () => {
    saveMock.mockResolvedValue('template-1');
    const user = userEvent.setup();
    render(<CreateTemplatePage />);

    await user.type(screen.getByRole('textbox', { name: /Navn på malen/ }), 'Butikksjef');
    await user.type(screen.getByRole('textbox', { name: /Kort beskrivelse/ }), 'Vennlig.');
    await user.type(
      screen.getByRole('textbox', { name: /Beskrivelse av intervjueren/ }),
      'Hen er butikksjef.',
    );
    await user.click(screen.getByRole('button', { name: 'Lagre mal' }));

    expect(saveMock).toHaveBeenCalledWith({
      title: 'Butikksjef',
      description: 'Vennlig.',
      focus: [],
      persona: 'Hen er butikksjef.',
    });
    expect(await screen.findByText(/Malen «Butikksjef» er lagret/)).toBeInTheDocument();
  });

  it('sets a Norwegian tab title', () => {
    expect(metadata.title).toBe('Lag en mal');
  });
});
