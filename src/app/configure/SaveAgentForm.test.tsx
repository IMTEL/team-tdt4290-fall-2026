import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChatError } from '@/components/chat/sendToAgent';
import { DEFAULT_ADVANCED_SETTINGS } from '@/domain/advancedSettings';
import { interviewer } from '@/domain/agentTypes/interviewer';
import { saveConfiguredAgent } from './api';
import { SaveAgentForm } from './SaveAgentForm';

vi.mock('./api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api')>()),
  saveConfiguredAgent: vi.fn(),
}));
const saveMock = vi.mocked(saveConfiguredAgent);

vi.mock('@/components/agents/useLanguageModels', () => ({
  useLanguageModels: () => ({
    models: ['openai/gpt-oss-120b', 'meta/llama-3.3-70b'],
    loading: false,
    failed: false,
  }),
}));

const configuration = {
  stilling: 'Butikkmedarbeider',
  bransje: 'Varehandel (privat)',
  bedrift: 'Nærbutikken AS',
  intervjutype: 'første intervju',
  intervjuer: 'butikksjef, vennlig',
  jobbsoker: 'under 25, lite erfaring',
  vanskelighetsgrad: 'lett | Antall spørsmål: 6 | Oppfølgingsspørsmål: ja',
  egneSporsmal: 'ingen',
  tillegg: '',
};

function setup() {
  const user = userEvent.setup();
  const onClose = vi.fn();
  render(
    <SaveAgentForm definition={interviewer} configuration={configuration} onClose={onClose} />,
  );
  const nameBox = () => screen.getByRole('textbox', { name: /Navn på agenten/ });
  const saveButton = () => screen.getByRole('button', { name: 'Lagre agent' });
  return { user, nameBox, saveButton, onClose };
}

describe('SaveAgentForm', () => {
  afterEach(() => {
    saveMock.mockReset();
  });

  it('saves the configuration under the chosen name and links to testing it and to the agents', async () => {
    saveMock.mockResolvedValue('agent-1');
    const { user, nameBox, saveButton } = setup();

    await user.clear(nameBox());
    await user.type(nameBox(), 'Butikksjef Kari');
    await user.click(saveButton());

    // Without changes to the advanced settings the server uses its defaults.
    expect(saveMock).toHaveBeenCalledWith(
      'Butikksjef Kari',
      interviewer,
      configuration,
      {},
      undefined,
      null,
    );
    expect(await screen.findByText(/«Butikksjef Kari» er lagret/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Test agenten' })).toHaveAttribute(
      'href',
      '/test-chat?agent=agent-1',
    );
    expect(screen.getByRole('link', { name: 'se agentene dine' })).toHaveAttribute(
      'href',
      '/browse-agents',
    );
  });

  it('saves the agent with the advanced settings chosen before saving', async () => {
    saveMock.mockResolvedValue('agent-1');
    const { user, saveButton } = setup();

    await user.click(screen.getByRole('button', { name: /Avanserte innstillinger/ }));
    await user.click(screen.getByRole('combobox', { name: 'Språkmodell' }));
    await user.click(screen.getByRole('option', { name: 'meta/llama-3.3-70b' }));
    await user.click(saveButton());

    expect(saveMock).toHaveBeenCalledWith(
      'Intervjuer for Butikkmedarbeider',
      interviewer,
      configuration,
      {},
      {
        ...DEFAULT_ADVANCED_SETTINGS,
        model: 'meta/llama-3.3-70b',
      },
      null,
    );
  });

  it('offers the avatars, with the default image chosen from the start', () => {
    setup();

    expect(screen.getByRole('radiogroup', { name: 'Avatar' })).toBeVisible();
    expect(screen.getByRole('radio', { name: 'Standard' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Robot' })).toBeInTheDocument();
  });

  it('saves the agent with the avatar that was chosen', async () => {
    saveMock.mockResolvedValue('agent-1');
    const { user, saveButton } = setup();

    await user.click(screen.getByRole('radio', { name: 'Pingvin' }));
    await user.click(saveButton());

    expect(saveMock).toHaveBeenCalledWith(
      'Intervjuer for Butikkmedarbeider',
      interviewer,
      configuration,
      {},
      undefined,
      'pingvin',
    );
  });

  it('does not offer writing the system prompt by hand', async () => {
    const { user } = setup();

    await user.click(screen.getByRole('button', { name: /Avanserte innstillinger/ }));

    expect(
      screen.queryByRole('switch', { name: 'Skriv systemprompten selv' }),
    ).not.toBeInTheDocument();
  });

  it('cannot be saved without a name', async () => {
    const { user, nameBox, saveButton } = setup();

    await user.clear(nameBox());

    expect(saveButton()).toBeDisabled();
  });

  it('shows the error and lets the user try again', async () => {
    saveMock
      .mockRejectedValueOnce(new ChatError('Du er logget ut. Logg inn på nytt for å fortsette.'))
      .mockResolvedValueOnce('agent-1');
    const { user, saveButton } = setup();

    await user.click(saveButton());
    expect(await screen.findByText(/Du er logget ut/)).toBeInTheDocument();

    await user.click(saveButton());
    expect(await screen.findByText(/er lagret/)).toBeInTheDocument();
    expect(saveMock).toHaveBeenCalledTimes(2);
  });

  it('goes back to the chat to change something', async () => {
    const { user, onClose } = setup();

    await user.click(screen.getByRole('button', { name: 'Nei, jeg vil endre noe' }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('offers only to close once the interviewer is saved', async () => {
    saveMock.mockResolvedValue('agent-1');
    const { user, saveButton, onClose } = setup();

    await user.click(saveButton());
    await user.click(await screen.findByRole('button', { name: 'Lukk' }));

    expect(screen.queryByRole('button', { name: 'Lagre agent' })).not.toBeInTheDocument();
    expect(onClose).toHaveBeenCalledOnce();
  });
});
