import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChatError } from '@/components/chat/sendToAgent';
import { DEFAULT_ADVANCED_SETTINGS } from '@/domain/advancedSettings';
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
};

function setup() {
  const user = userEvent.setup();
  render(<SaveAgentForm configuration={configuration} />);
  const nameBox = () => screen.getByRole('textbox', { name: /Navn på intervjueren/ });
  const saveButton = () => screen.getByRole('button', { name: 'Lagre agent' });
  return { user, nameBox, saveButton };
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
    expect(saveMock).toHaveBeenCalledWith('Butikksjef Kari', configuration, undefined);
    expect(await screen.findByText(/«Butikksjef Kari» er lagret/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Test intervjueren' })).toHaveAttribute(
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

    expect(saveMock).toHaveBeenCalledWith('Intervjuer for Butikkmedarbeider', configuration, {
      ...DEFAULT_ADVANCED_SETTINGS,
      model: 'meta/llama-3.3-70b',
    });
  });

  it('cannot be saved with an empty hand-written prompt', async () => {
    const { user, saveButton } = setup();

    await user.click(screen.getByRole('button', { name: /Avanserte innstillinger/ }));
    await user.click(screen.getByRole('switch', { name: 'Skriv systemprompten selv' }));
    await user.clear(screen.getByRole('textbox', { name: 'Systemprompt' }));

    expect(saveButton()).toBeDisabled();
    expect(screen.getByText('Systemprompten kan ikke være tom.')).toBeVisible();
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
});
