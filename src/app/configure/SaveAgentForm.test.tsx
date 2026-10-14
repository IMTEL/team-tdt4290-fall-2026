import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChatError } from '@/components/chat/sendToAgent';
import { saveConfiguredAgent } from './api';
import { SaveAgentForm } from './SaveAgentForm';

vi.mock('./api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api')>()),
  saveConfiguredAgent: vi.fn(),
}));
const saveMock = vi.mocked(saveConfiguredAgent);

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
  render(<SaveAgentForm configuration={configuration} onClose={onClose} />);
  const nameBox = () => screen.getByRole('textbox', { name: /Navn på intervjueren/ });
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

    expect(saveMock).toHaveBeenCalledWith('Butikksjef Kari', configuration, {});
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
