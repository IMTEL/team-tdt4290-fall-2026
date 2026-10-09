import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { findTemplate } from '@/data/interviewer-templates';
import { sendConfigurationTurn } from './api';
import { ConfigurationChat } from './ConfigurationChat';

// The chat itself is tested in AgentChat.test.tsx and the save form in SaveAgentForm.test.tsx.
// Here we only check what this page adds: the greeting, which route answers, and showing the
// save form once the configuration is finished.
vi.mock('./api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api')>()),
  sendConfigurationTurn: vi.fn(),
}));
const sendMock = vi.mocked(sendConfigurationTurn);
const template = findTemplate('teamleder')!;
const profile = {
  id: 'profile-1',
  label: 'Profil A',
  ageRange: '18-24' as const,
  experienceLevel: 'little' as const,
  workExperience: '',
  education: '',
  languages: [],
  practiceAreas: ['Mestre nervøsitet'],
  notes: '',
};

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

async function sendMessage(text: string) {
  const user = userEvent.setup();
  await user.type(screen.getByRole('textbox', { name: 'Melding' }), `${text}{Enter}`);
}

describe('ConfigurationChat', () => {
  afterEach(() => {
    sendMock.mockReset();
  });

  it('opens with the assistant naming the template and asking about the job', () => {
    render(<ConfigurationChat template={template} profile={null} />);

    expect(screen.getByText(/malen «Teamleder»/)).toBeInTheDocument();
    expect(screen.getByText(/Hvilken stilling skal jobbsøkeren øve til\?/)).toBeInTheDocument();
  });

  it('sends the template and the conversation, greeting included, to the configurator', async () => {
    sendMock.mockResolvedValue({ reply: 'Neste spørsmål', configuration: null });
    render(<ConfigurationChat template={template} profile={null} />);

    await sendMessage('Butikkmedarbeider');
    await screen.findByText('Neste spørsmål');

    const [choices, history] = sendMock.mock.calls[0];
    expect(choices).toEqual({ templateId: 'teamleder', profileId: null });
    expect(history.map(({ role, content }) => ({ role, content }))).toEqual([
      { role: 'assistant', content: expect.stringContaining('Hei!') },
      { role: 'user', content: 'Butikkmedarbeider' },
    ]);
  });

  it('without a template, names none and sends null as the template', async () => {
    sendMock.mockResolvedValue({ reply: 'Neste spørsmål', configuration: null });
    render(<ConfigurationChat template={null} profile={null} />);

    expect(screen.queryByText(/malen/)).not.toBeInTheDocument();

    await sendMessage('Butikkmedarbeider');
    await screen.findByText('Neste spørsmål');

    expect(sendMock.mock.calls[0][0]).toEqual({ templateId: null, profileId: null });
  });

  it('names the profile in the greeting and sends its id along with the template', async () => {
    sendMock.mockResolvedValue({ reply: 'Neste spørsmål', configuration: null });
    render(<ConfigurationChat template={template} profile={profile} />);

    expect(screen.getByText(/malen «Teamleder»/)).toBeInTheDocument();
    expect(screen.getByText(/jobbsøkerprofilen «Profil A»/)).toBeInTheDocument();

    await sendMessage('Butikkmedarbeider');
    await screen.findByText('Neste spørsmål');

    expect(sendMock.mock.calls[0][0]).toEqual({ templateId: 'teamleder', profileId: 'profile-1' });
  });

  it('can use a profile without a template', () => {
    render(<ConfigurationChat template={null} profile={profile} />);

    expect(screen.queryByText(/malen/)).not.toBeInTheDocument();
    expect(screen.getByText(/jobbsøkerprofilen «Profil A»/)).toBeInTheDocument();
  });

  it('does not offer to save before the configuration is finished', async () => {
    sendMock.mockResolvedValue({ reply: 'Neste spørsmål', configuration: null });
    render(<ConfigurationChat template={template} profile={null} />);

    await sendMessage('Butikkmedarbeider');
    await screen.findByText('Neste spørsmål');

    expect(screen.queryByRole('button', { name: 'Lagre agent' })).not.toBeInTheDocument();
  });

  it('offers to save once the configurator has finished', async () => {
    sendMock.mockResolvedValue({ reply: 'Ferdig!', configuration });
    render(<ConfigurationChat template={template} profile={null} />);

    await sendMessage('Ja, det stemmer');

    expect(await screen.findByRole('button', { name: 'Lagre agent' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Navn på intervjueren/ })).toHaveValue(
      'Intervjuer for Butikkmedarbeider',
    );
  });
});
