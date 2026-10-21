import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { parseFocus, TemplateForm } from './TemplateForm';

const saved = {
  agentType: 'interviewer',
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

  /**
   * Puts the text into the field. Pastes instead of typing: typing re-renders the MUI field once
   * per letter, which is slow enough to time out when the whole test suite runs at once.
   */
  async function enter(name: RegExp, text: string) {
    await user.click(field(name));
    await user.paste(text);
  }

  async function fillIn() {
    await enter(/Navn på malen/, '  Butikksjef ');
    await enter(/Kort beskrivelse/, 'Vennlig og direkte.');
    await enter(/Fokusområder/, 'Service, , Samarbeid ');
    await enter(/Beskrivelse av intervjueren/, 'Intervjueren er butikksjef.');
  }

  return { user, onSave, field, enter, fillIn };
}

describe('TemplateForm for a new template', () => {
  const saveButton = () => screen.getByRole('button', { name: 'Lagre mal' });

  it('saves the template with trimmed fields and links back to /configure', async () => {
    const { user, onSave, fillIn } = setup();

    await fillIn();
    await user.click(saveButton());

    expect(onSave).toHaveBeenCalledWith(saved);
    expect(await screen.findByText(/Malen «Butikksjef» er lagret/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Bruk den til å sette opp en agent' })).toHaveAttribute(
      'href',
      '/configure',
    );
  });

  it('cannot be saved until the required fields are filled in', async () => {
    const { enter } = setup();

    expect(saveButton()).toBeDisabled();
    await enter(/Navn på malen/, 'Butikksjef');
    await enter(/Kort beskrivelse/, '   ');

    expect(saveButton()).toBeDisabled();
  });

  it('cannot be saved with too many focus areas', async () => {
    const { user, field, enter, fillIn } = setup();

    await fillIn();
    await user.clear(field(/Fokusområder/));
    await enter(/Fokusområder/, 'a, b, c, d, e, f, g');

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

  it('lets the counsellor choose the agent type, with planned types shown but not choosable', async () => {
    const { user } = setup();
    const type = screen.getByRole('combobox', { name: /Type agent/ });
    expect(type).toHaveTextContent('Intervjuer');

    await user.click(type);

    expect(screen.getByRole('option', { name: 'Intervjuer' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Lærer (kommer snart)' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('takes its labels from the chosen agent type', () => {
    setup();

    expect(screen.getByText('Hvem er intervjueren? For eksempel «Butikksjef».')).toBeVisible();
    expect(screen.getByRole('textbox', { name: /Beskrivelse av intervjueren/ })).toBeVisible();
  });

  it('saves the chosen agent type with the template', async () => {
    const { user, onSave, fillIn } = setup();

    await fillIn();
    await user.click(screen.getByRole('button', { name: 'Lagre mal' }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ agentType: 'interviewer' }));
  });

  it('has a cancel link back to /configure', () => {
    setup();

    expect(screen.getByRole('link', { name: 'Avbryt' })).toHaveAttribute('href', '/configure');
  });

  it('cancels back to the page the form was opened from', () => {
    render(
      <TemplateForm
        onSave={vi.fn()}
        cancelHref="/configure?type=interviewer&step=intervjuer"
      />,
    );

    expect(screen.getByRole('link', { name: 'Avbryt' })).toHaveAttribute(
      'href',
      '/configure?type=interviewer&step=intervjuer',
    );
  });
});

describe('TemplateForm for a saved template', () => {
  it('starts with the saved values, and saves the changes', async () => {
    const { user, onSave, field, enter } = setup(saved);

    expect(field(/Navn på malen/)).toHaveValue('Butikksjef');
    expect(field(/Fokusområder/)).toHaveValue('Service, Samarbeid');

    await user.clear(field(/Navn på malen/));
    await enter(/Navn på malen/, 'Kjøpmann');
    await user.click(screen.getByRole('button', { name: 'Lagre endringene' }));

    expect(onSave).toHaveBeenCalledWith({ ...saved, title: 'Kjøpmann' });
    expect(await screen.findByText(/Malen «Kjøpmann» er lagret/)).toBeInTheDocument();
  });
});

describe('TemplateForm agent type', () => {
  it('cannot be changed once the template is saved', () => {
    render(<TemplateForm initial={saved} onSave={vi.fn()} />);

    expect(screen.getByRole('combobox', { name: /Type agent/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByText('Typen kan ikke endres etter at malen er lagret.')).toBeVisible();
  });

  it('starts with the agent type it is given, and ignores one templates cannot be made for', () => {
    const { unmount } = render(<TemplateForm defaultAgentType="interviewer" onSave={vi.fn()} />);
    expect(screen.getByRole('combobox', { name: /Type agent/ })).toHaveTextContent('Intervjuer');
    unmount();

    render(<TemplateForm defaultAgentType="teacher" onSave={vi.fn()} />);
    expect(screen.getByRole('combobox', { name: /Type agent/ })).toHaveTextContent('Intervjuer');
  });
});

describe('parseFocus', () => {
  it('splits on commas and drops empty items', () => {
    expect(parseFocus(' Service ,, Samarbeid ,')).toEqual(['Service', 'Samarbeid']);
    expect(parseFocus('   ')).toEqual([]);
  });
});
