import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { parseFocus, TemplateForm } from './TemplateForm';

const saved = {
  title: 'Butikksjef',
  description: 'Vennlig og direkte.',
  focus: ['Service', 'Samarbeid'],
  persona: 'Intervjueren er butikksjef.',
};

function setup(initial?: typeof saved) {
  const user = userEvent.setup();
  const onSave = vi.fn<(template: typeof saved) => Promise<void>>().mockResolvedValue();
  render(<TemplateForm initial={initial} onSave={onSave} />);
  const field = (name: RegExp) => screen.getByRole('textbox', { name });

  async function fillIn() {
    await user.type(field(/Navn på malen/), '  Butikksjef ');
    await user.type(field(/Kort beskrivelse/), 'Vennlig og direkte.');
    await user.type(field(/Fokusområder/), 'Service, , Samarbeid ');
    await user.type(field(/Beskrivelse av intervjueren/), 'Intervjueren er butikksjef.');
  }

  return { user, onSave, field, fillIn };
}

describe('TemplateForm for a new template', () => {
  const saveButton = () => screen.getByRole('button', { name: 'Lagre mal' });

  it('saves the template with trimmed fields and links back to /configure', async () => {
    const { user, onSave, fillIn } = setup();

    await fillIn();
    await user.click(saveButton());

    expect(onSave).toHaveBeenCalledWith(saved);
    expect(await screen.findByText(/Malen «Butikksjef» er lagret/)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Bruk den til å sette opp en intervjuer' }),
    ).toHaveAttribute('href', '/configure');
  });

  it('cannot be saved until the required fields are filled in', async () => {
    const { user, field } = setup();

    expect(saveButton()).toBeDisabled();
    await user.type(field(/Navn på malen/), 'Butikksjef');
    await user.type(field(/Kort beskrivelse/), '   ');

    expect(saveButton()).toBeDisabled();
  });

  it('cannot be saved with too many focus areas', async () => {
    const { user, field, fillIn } = setup();

    await fillIn();
    await user.clear(field(/Fokusområder/));
    await user.type(field(/Fokusområder/), 'a, b, c, d, e, f, g');

    expect(screen.getByText('Skriv høyst 6 fokusområder.')).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });

  it('shows the error and keeps what was typed when saving fails', async () => {
    const { user, onSave, field, fillIn } = setup();
    onSave.mockRejectedValue(new Error('Du er logget ut. Logg inn på nytt og prøv igjen.'));

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
});

describe('TemplateForm for a saved template', () => {
  it('starts with the saved values, and saves the changes', async () => {
    const { user, onSave, field } = setup(saved);

    expect(field(/Navn på malen/)).toHaveValue('Butikksjef');
    expect(field(/Fokusområder/)).toHaveValue('Service, Samarbeid');

    await user.clear(field(/Navn på malen/));
    await user.type(field(/Navn på malen/), 'Kjøpmann');
    await user.click(screen.getByRole('button', { name: 'Lagre endringene' }));

    expect(onSave).toHaveBeenCalledWith({ ...saved, title: 'Kjøpmann' });
    expect(await screen.findByText(/Malen «Kjøpmann» er lagret/)).toBeInTheDocument();
  });
});

describe('parseFocus', () => {
  it('splits on commas and drops empty items', () => {
    expect(parseFocus(' Service ,, Samarbeid ,')).toEqual(['Service', 'Samarbeid']);
    expect(parseFocus('   ')).toEqual([]);
  });
});
