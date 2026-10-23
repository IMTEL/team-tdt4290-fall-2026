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
    render(await CreateTemplatePage({ searchParams: Promise.resolve({}) }));

    // Pastes instead of typing: typing re-renders the MUI field once per letter, which is slow
    // enough to time out when the whole test suite runs at once.
    async function enter(name: RegExp, text: string) {
      await user.click(screen.getByRole('textbox', { name }));
      await user.paste(text);
    }

    await enter(/Navn på malen/, 'Butikksjef');
    await enter(/Kort beskrivelse/, 'Vennlig.');
    await enter(/Beskrivelse av intervjueren/, 'Hen er butikksjef.');
    await user.click(screen.getByRole('button', { name: 'Lagre mal' }));

    expect(saveMock).toHaveBeenCalledWith({
      agentType: 'interviewer',
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

  it('sends Avbryt back to the page that opened the form', async () => {
    render(
      await CreateTemplatePage({
        searchParams: Promise.resolve({
          agentType: 'interviewer',
          returnTo: '/configure?type=interviewer&step=intervjuer',
        }),
      }),
    );

    expect(screen.getByRole('link', { name: 'Avbryt' })).toHaveAttribute(
      'href',
      '/configure?type=interviewer&step=intervjuer',
    );
  });

  it('ignores a cancel target that leaves the site', async () => {
    render(
      await CreateTemplatePage({
        searchParams: Promise.resolve({ returnTo: 'https://example.com' }),
      }),
    );

    expect(screen.getByRole('link', { name: 'Avbryt' })).toHaveAttribute('href', '/configure');
  });
});
