import { render, screen } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_ADVANCED_SETTINGS, DEFAULT_MODEL } from '@/domain/advancedSettings';
import { interviewer } from '@/domain/agentTypes/interviewer';
import { updateAgent } from '../../api';
import { EditAgentForm } from './EditAgentForm';

const push = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('../../api', () => ({ updateAgent: vi.fn() }));
vi.mock('@/components/agents/useLanguageModels', () => ({
  useLanguageModels: () => ({
    models: ['openai/gpt-oss-120b', 'meta/llama-3.3-70b'],
    loading: false,
    failed: false,
  }),
}));

const updateAgentMock = vi.mocked(updateAgent);

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

function renderForm(initialAnswers = answers, initialSettings = DEFAULT_ADVANCED_SETTINGS) {
  render(
    <EditAgentForm
      agentId="agent-1"
      initialName="Intervjuer for Barnehagelærer"
      definition={interviewer}
      initialAnswers={initialAnswers}
      initialSettings={initialSettings}
    />,
  );
}

const savedAgent = {
  id: 'agent-1',
  name: 'Ny intervjuer',
  description: '{}',
  lastUpdated: '2026-10-06T12:00:00.000Z',
  llmModel: DEFAULT_MODEL,
  temperature: 0.7,
  prompt: 'Du er en intervjuer.',
};

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
    updateAgentMock.mockReset();
    push.mockReset();
  });

  it('shows the name and one field per answer, filled in', () => {
    renderForm();

    expect(field('Navn')).toHaveValue('Intervjuer for Barnehagelærer');
    expect(field('Stilling')).toHaveValue('Barnehagelærer');
    expect(field('Vanskelighetsgrad')).toHaveValue('lett');
  });

  it('saves the changes and goes back to the agent', async () => {
    updateAgentMock.mockResolvedValue(savedAgent);
    const user = userEvent.setup();
    renderForm();

    await replaceText(user, 'Navn', 'Ny intervjuer');
    await replaceText(user, 'Vanskelighetsgrad', 'vanskelig');
    await user.click(saveButton());

    // Unchanged advanced settings are not sent, so the agent keeps the ones it has.
    expect(updateAgentMock).toHaveBeenCalledWith(
      'agent-1',
      'Ny intervjuer',
      { ...answers, vanskelighetsgrad: 'vanskelig' },
      undefined,
    );
    expect(push).toHaveBeenCalledWith('/browse-agents/agent-1');
  });

  it('saves a hand-written system prompt with the advanced settings', async () => {
    updateAgentMock.mockResolvedValue(savedAgent);
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: /Avanserte innstillinger/ }));
    await user.click(screen.getByRole('switch', { name: 'Skriv systemprompten selv' }));
    // The editor starts with the prompt built from the answers.
    expect(field('Systemprompt')).toHaveValue(interviewer.buildPrompt(answers));

    await replaceText(user, 'Systemprompt', 'Du er en streng barnehagestyrer.');
    expect(screen.getByText('1 endring som ikke er lagret')).toBeVisible();
    await user.click(saveButton());

    expect(updateAgentMock).toHaveBeenCalledWith(
      'agent-1',
      'Intervjuer for Barnehagelærer',
      answers,
      {
        ...DEFAULT_ADVANCED_SETTINGS,
        customPrompt: 'Du er en streng barnehagestyrer.',
      },
    );
  });

  it('says the answers no longer change a hand-written prompt', () => {
    renderForm(answers, { ...DEFAULT_ADVANCED_SETTINGS, customPrompt: 'Du er Kari.' });

    expect(
      screen.getByText('Systemprompten er skrevet for hånd, så disse svarene endrer den ikke.'),
    ).toBeVisible();
  });

  it('can still be saved when settings it did not change would not pass its own checks', async () => {
    updateAgentMock.mockResolvedValue(savedAgent);
    const user = userEvent.setup();
    // Saved by another client with three decimals, which the form would not accept.
    renderForm(answers, { ...DEFAULT_ADVANCED_SETTINGS, temperature: 0.333 });

    await replaceText(user, 'Navn', 'Ny intervjuer');
    expect(screen.getByText('1 endring som ikke er lagret')).toBeVisible();
    expect(saveButton()).toBeEnabled();
    await user.click(saveButton());

    expect(updateAgentMock).toHaveBeenCalledWith('agent-1', 'Ny intervjuer', answers, undefined);
  });

  it('cannot be saved with an invalid temperature, and says why in Norwegian', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: /Avanserte innstillinger/ }));
    await replaceText(user, 'Verdi', '3');

    expect(saveButton()).toBeDisabled();
    expect(screen.getByText(/Temperaturen må være et tall mellom 0 og 2/)).toBeVisible();
  });

  it('shows the error and keeps what was typed when saving fails', async () => {
    updateAgentMock.mockRejectedValue(
      new Error('Du er logget ut. Logg inn på nytt og prøv igjen.'),
    );
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
