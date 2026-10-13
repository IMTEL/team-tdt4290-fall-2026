import { render, screen } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { interviewer } from '@/domain/agentTypes/interviewer';
import type { Answers } from '@/domain/agentTypes/types';
import { EditAgentForm } from './EditAgentForm';

const push = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const onSave = vi.fn<(name: string, answers: Answers) => Promise<string>>();

const answers = {
  stilling: 'Barnehagelærer',
  bransje: 'Barnehage (offentlig)',
  bedrift: 'Ingen navn',
  intervjutype: 'første intervju',
  intervjuer: 'leder, vennlig',
  jobbsoker: 'under 25, lite erfaring',
  vanskelighetsgrad: 'lett',
  egneSporsmal: 'ingen',
};

function renderForm(initialAnswers = answers, allowUnchanged = false) {
  render(
    <EditAgentForm
      agentId="agent-1"
      initialName="Intervjuer for Barnehagelærer"
      definition={interviewer}
      initialAnswers={initialAnswers}
      label="Rediger agent"
      submitLabel="Lagre endringer"
      onSave={onSave}
      allowUnchanged={allowUnchanged}
    />,
  );
}

// MUI adds " *" to the label of a required field, so we match the start of the label.
const field = (label: string) => screen.getByRole('textbox', { name: new RegExp(`^${label}`) });
const saveButton = () => screen.getByRole('button', { name: 'Lagre endringer' });

/**
 * Replaces the text in a field. Pastes instead of typing: typing re-renders the MUI field once
 * per letter, which is slow enough to time out when the whole test suite runs at once.
 */
async function replaceText(user: UserEvent, label: string, text: string) {
  await user.clear(field(label));
  await user.paste(text);
}

describe('EditAgentForm', () => {
  afterEach(() => {
    onSave.mockReset();
    push.mockReset();
  });

  it('shows the name and one field per answer, filled in', () => {
    renderForm();

    expect(field('Navn')).toHaveValue('Intervjuer for Barnehagelærer');
    expect(field('Stilling')).toHaveValue('Barnehagelærer');
    expect(field('Vanskelighetsgrad')).toHaveValue('lett');
  });

  it('saves the changes and goes to the agent the save returns', async () => {
    onSave.mockResolvedValue('agent-2');
    const user = userEvent.setup();
    renderForm();

    await replaceText(user, 'Navn', 'Ny intervjuer');
    await replaceText(user, 'Vanskelighetsgrad', 'vanskelig');
    await user.click(saveButton());

    expect(onSave).toHaveBeenCalledWith('Ny intervjuer', {
      ...answers,
      vanskelighetsgrad: 'vanskelig',
    });
    expect(push).toHaveBeenCalledWith('/browse-agents/agent-2');
  });

  it('shows the error and keeps what was typed when saving fails', async () => {
    onSave.mockRejectedValue(new Error('Du er logget ut. Logg inn på nytt og prøv igjen.'));
    const user = userEvent.setup();
    renderForm();

    await replaceText(user, 'Vanskelighetsgrad', 'vanskelig');
    await user.click(saveButton());

    expect(await screen.findByRole('alert')).toHaveTextContent('Du er logget ut.');
    expect(field('Vanskelighetsgrad')).toHaveValue('vanskelig');
    expect(push).not.toHaveBeenCalled();
  });

  it('cannot be saved before something is changed, and counts the changes', async () => {
    const user = userEvent.setup();
    renderForm();

    expect(saveButton()).toBeDisabled();
    expect(screen.getByText('Ingen endringer ennå')).toBeVisible();

    await replaceText(user, 'Vanskelighetsgrad', 'vanskelig');

    expect(saveButton()).toBeEnabled();
    expect(screen.getByText('1 endring som ikke er lagret')).toBeVisible();
  });

  it('can be saved without changes when that is allowed, as for a clone', async () => {
    onSave.mockResolvedValue('agent-2');
    const user = userEvent.setup();
    renderForm(answers, true);

    await user.click(saveButton());

    expect(onSave).toHaveBeenCalledWith('Intervjuer for Barnehagelærer', answers);
  });

  it('cannot be saved while a field is empty', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.clear(field('Bransje'));

    expect(saveButton()).toBeDisabled();
  });

  it('shows an empty field for an answer the agent type got after saving', () => {
    renderForm({ ...answers, bedrift: '' });

    expect(field('Bedrift')).toHaveValue('');
    expect(saveButton()).toBeDisabled();
  });
});
