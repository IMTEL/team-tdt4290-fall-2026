import { render, screen } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { interviewer } from '@/domain/agentTypes/interviewer';
import type { Answers } from '@/domain/agentTypes/types';
import { EditAgentForm, type AnswerPreset } from './EditAgentForm';

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

const profilePreset: AnswerPreset = {
  field: 'jobbsoker',
  label: 'Jobbsøkerprofil',
  options: [{ id: 'profile-1', label: 'Profil A', value: 'aldersgruppe 30–39 år' }],
  manageHref: '/profiles',
  manageLabel: 'Administrer profiler',
};

function renderForm(initialAnswers = answers, allowUnchanged = false, presets?: AnswerPreset[]) {
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
      presets={presets}
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

  it('fills in an answer from a preset, counts it as a change and saves it', async () => {
    onSave.mockResolvedValue('agent-1');
    const user = userEvent.setup();
    renderForm(answers, false, [profilePreset]);

    await user.click(screen.getByRole('combobox', { name: 'Jobbsøkerprofil' }));
    await user.click(screen.getByRole('option', { name: 'Profil A' }));

    expect(field('Jobbsøker')).toHaveValue('aldersgruppe 30–39 år');
    expect(screen.getByText('1 endring som ikke er lagret')).toBeVisible();

    await user.click(saveButton());

    expect(onSave).toHaveBeenCalledWith('Intervjuer for Barnehagelærer', {
      ...answers,
      jobbsoker: 'aldersgruppe 30–39 år',
    });
  });

  it('shows the option the saved answer comes from, and "Egen tekst" once it is changed', async () => {
    const user = userEvent.setup();
    renderForm({ ...answers, jobbsoker: 'aldersgruppe 30–39 år' }, false, [profilePreset]);

    const select = screen.getByRole('combobox', { name: 'Jobbsøkerprofil' });
    expect(select).toHaveTextContent('Profil A');

    await user.type(field('Jobbsøker'), ', snakker engelsk');

    expect(select).toHaveTextContent('Egen tekst');
  });

  it('shows "Egen tekst" when the saved answer is not from an option', () => {
    renderForm(answers, false, [profilePreset]);

    expect(screen.getByRole('combobox', { name: 'Jobbsøkerprofil' })).toHaveTextContent(
      'Egen tekst',
    );
  });

  it('puts the saved answer back when "Egen tekst" is chosen', async () => {
    const user = userEvent.setup();
    renderForm(answers, false, [profilePreset]);

    await user.click(screen.getByRole('combobox', { name: 'Jobbsøkerprofil' }));
    await user.click(screen.getByRole('option', { name: 'Profil A' }));
    await user.click(screen.getByRole('combobox', { name: 'Jobbsøkerprofil' }));
    await user.click(screen.getByRole('option', { name: 'Egen tekst' }));

    expect(field('Jobbsøker')).toHaveValue('under 25, lite erfaring');
    expect(screen.getByText('Ingen endringer ennå')).toBeVisible();
  });

  it('links to where the options are managed', () => {
    renderForm(answers, false, [profilePreset]);

    expect(screen.getByRole('link', { name: 'Administrer profiler' })).toHaveAttribute(
      'href',
      '/profiles',
    );
  });
});
