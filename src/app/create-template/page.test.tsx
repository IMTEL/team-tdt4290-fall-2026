import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { saveTemplate } from './api';
import { parseFocus } from './CreateTemplateForm';
import CreateTemplatePage, { metadata } from './page';

vi.mock('./api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api')>()),
  saveTemplate: vi.fn(),
}));
const saveMock = vi.mocked(saveTemplate);

function setup() {
  const user = userEvent.setup();
  render(<CreateTemplatePage />);
  const field = (name: RegExp) => screen.getByRole('textbox', { name });
  const saveButton = () => screen.getByRole('button', { name: 'Lagre mal' });

  async function fillIn() {
    await user.type(field(/Navn på malen/), '  Butikksjef ');
    await user.type(field(/Kort beskrivelse/), 'Vennlig og direkte.');
    await user.type(field(/Fokusområder/), 'Service, , Samarbeid ');
    await user.type(field(/Beskrivelse av intervjueren/), 'Intervjueren er butikksjef.');
  }

  return { user, field, saveButton, fillIn };
}

afterEach(() => {
  saveMock.mockReset();
});

describe('/create-template', () => {
  it('saves the template with trimmed fields and links back to /configure', async () => {
    saveMock.mockResolvedValue('template-1');
    const { user, saveButton, fillIn } = setup();

    await fillIn();
    await user.click(saveButton());

    expect(saveMock).toHaveBeenCalledWith({
      title: 'Butikksjef',
      description: 'Vennlig og direkte.',
      focus: ['Service', 'Samarbeid'],
      persona: 'Intervjueren er butikksjef.',
    });
    expect(await screen.findByText(/Malen «Butikksjef» er lagret/)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Bruk den til å sette opp en intervjuer' }),
    ).toHaveAttribute('href', '/configure');
  });

  it('cannot be saved until the required fields are filled in', async () => {
    const { user, field, saveButton } = setup();

    expect(saveButton()).toBeDisabled();
    await user.type(field(/Navn på malen/), 'Butikksjef');
    await user.type(field(/Kort beskrivelse/), '   ');

    expect(saveButton()).toBeDisabled();
  });

  it('cannot be saved with too many focus areas', async () => {
    const { user, field, saveButton, fillIn } = setup();

    await fillIn();
    await user.clear(field(/Fokusområder/));
    await user.type(field(/Fokusområder/), 'a, b, c, d, e, f, g');

    expect(screen.getByText('Skriv høyst 6 fokusområder.')).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });

  it('shows the error and keeps what was typed when saving fails', async () => {
    saveMock.mockRejectedValue(new Error('Du er logget ut. Logg inn på nytt og prøv igjen.'));
    const { user, field, saveButton, fillIn } = setup();

    await fillIn();
    await user.click(saveButton());

    expect(await screen.findByRole('alert')).toHaveTextContent('Du er logget ut');
    expect(field(/Navn på malen/)).toHaveValue('  Butikksjef ');
    expect(saveButton()).toBeEnabled();
  });

  it('has a cancel link back to /configure', () => {
    setup();

    expect(screen.getByRole('link', { name: 'Avbryt' })).toHaveAttribute('href', '/configure');
  });

  it('sets a Norwegian tab title', () => {
    expect(metadata.title).toBe('Lag en mal');
  });
});

describe('parseFocus', () => {
  it('splits on commas and drops empty items', () => {
    expect(parseFocus(' Service ,, Samarbeid ,')).toEqual(['Service', 'Samarbeid']);
    expect(parseFocus('   ')).toEqual([]);
  });
});
