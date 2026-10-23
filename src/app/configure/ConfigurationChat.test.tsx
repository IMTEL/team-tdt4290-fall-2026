import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { findIndustryTemplate } from '@/data/industry-templates';
import { findBuiltInTemplate } from '@/data/templates';
import { interviewer } from '@/domain/agentTypes/interviewer';
import { saveConfiguredAgent, sendConfigurationTurn } from './api';
import { ConfigurationChat, FINISHED_REPLY } from './ConfigurationChat';

// The chat itself is tested in AgentChat.test.tsx and the save form in SaveAgentForm.test.tsx.
// Here we only check what this page adds: the greeting, which route answers, and showing the
// save form once the configuration is finished.
vi.mock('./api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api')>()),
  sendConfigurationTurn: vi.fn(),
  saveConfiguredAgent: vi.fn(),
}));
const sendMock = vi.mocked(sendConfigurationTurn);
const saveMock = vi.mocked(saveConfiguredAgent);
const template = findBuiltInTemplate('teamleder')!;
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
  tillegg: '',
};

async function sendMessage(text: string) {
  const user = userEvent.setup();
  await user.type(screen.getByRole('textbox', { name: 'Melding' }), `${text}{Enter}`);
}

describe('ConfigurationChat', () => {
  afterEach(() => {
    sendMock.mockReset();
    saveMock.mockReset();
  });

  it('opens with the assistant naming the template and asking about the job', () => {
    render(<ConfigurationChat definition={interviewer} template={template} profile={null} />);

    expect(screen.getByText(/malen «Teamleder»/)).toBeInTheDocument();
    expect(screen.getByText(/Hvilken stilling skal jobbsøkeren øve til\?/)).toBeInTheDocument();
  });

  it('sends the template and the conversation, greeting included, to the configurator', async () => {
    sendMock.mockResolvedValue({ reply: 'Neste spørsmål', configuration: null, sources: {} });
    render(<ConfigurationChat definition={interviewer} template={template} profile={null} />);

    await sendMessage('Butikkmedarbeider');
    await screen.findByText('Neste spørsmål');

    const [definition, choices, history] = sendMock.mock.calls[0];
    expect(definition).toBe(interviewer);
    expect(choices).toEqual({ templateId: 'teamleder', profileId: null, industryTemplateId: null });
    expect(history.map(({ role, content }) => ({ role, content }))).toEqual([
      { role: 'assistant', content: expect.stringContaining('Hei!') },
      { role: 'user', content: 'Butikkmedarbeider' },
    ]);
  });

  it('sends a clicked option as a chat message and goes on with the conversation', async () => {
    sendMock
      .mockResolvedValueOnce({
        reply: `Offentlig eller privat?
[ALTERNATIVER: ett]
1. Offentlig
2. Privat`,
        configuration: null,
        sources: {},
      })
      .mockResolvedValueOnce({ reply: 'Hvilken bedrift?', configuration: null, sources: {} });
    render(<ConfigurationChat definition={interviewer} template={template} profile={null} />);

    await sendMessage('Butikkmedarbeider');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: '2. Privat' }));
    await screen.findByText('Hvilken bedrift?');

    const history = sendMock.mock.calls[1][2];
    expect(history.at(-1)).toMatchObject({ role: 'user', content: '2. Privat' });
  });

  it('with an industry template, names it and asks about the company instead of the job', async () => {
    sendMock.mockResolvedValue({ reply: 'Neste spørsmål', configuration: null, sources: {} });
    render(
      <ConfigurationChat
        definition={interviewer}
        template={template}
        profile={null}
        industry={findIndustryTemplate('helsefagarbeider')!}
      />,
    );

    expect(
      screen.getByText(/bransjemalen «Helsefagarbeider» \(Helse og omsorg, offentlig sektor\)/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Hvilken bedrift eller virksomhet/)).toBeInTheDocument();
    expect(screen.queryByText(/Hvilken stilling/)).not.toBeInTheDocument();

    await sendMessage('Byåsen sykehjem');
    await screen.findByText('Neste spørsmål');

    expect(sendMock.mock.calls[0][1]).toEqual({
      templateId: 'teamleder',
      profileId: null,
      industryTemplateId: 'helsefagarbeider',
    });
  });

  it('without a template, names none and sends null as the template', async () => {
    sendMock.mockResolvedValue({ reply: 'Neste spørsmål', configuration: null, sources: {} });
    render(<ConfigurationChat definition={interviewer} template={null} profile={null} />);

    expect(screen.queryByText(/malen/)).not.toBeInTheDocument();

    await sendMessage('Butikkmedarbeider');
    await screen.findByText('Neste spørsmål');

    expect(sendMock.mock.calls[0][1]).toEqual({
      templateId: null,
      profileId: null,
      industryTemplateId: null,
    });
  });

  it('names the profile in the greeting and sends its id along with the template', async () => {
    sendMock.mockResolvedValue({ reply: 'Neste spørsmål', configuration: null, sources: {} });
    render(<ConfigurationChat definition={interviewer} template={template} profile={profile} />);

    expect(screen.getByText(/malen «Teamleder»/)).toBeInTheDocument();
    expect(screen.getByText(/jobbsøkermalen «Profil A»/)).toBeInTheDocument();

    await sendMessage('Butikkmedarbeider');
    await screen.findByText('Neste spørsmål');

    expect(sendMock.mock.calls[0][1]).toEqual({
      templateId: 'teamleder',
      profileId: 'profile-1',
      industryTemplateId: null,
    });
  });

  it('can use a profile without a template', () => {
    render(<ConfigurationChat definition={interviewer} template={null} profile={profile} />);

    expect(screen.queryByText(/valgt malen «/)).not.toBeInTheDocument();
    expect(screen.getByText(/jobbsøkermalen «Profil A»/)).toBeInTheDocument();
  });

  it('does not offer to save before the configuration is finished', async () => {
    sendMock.mockResolvedValue({ reply: 'Neste spørsmål', configuration: null, sources: {} });
    render(<ConfigurationChat definition={interviewer} template={template} profile={null} />);

    await sendMessage('Butikkmedarbeider');
    await screen.findByText('Neste spørsmål');

    expect(screen.queryByRole('button', { name: 'Lagre agent' })).not.toBeInTheDocument();
  });

  it('offers to save once the configurator has finished', async () => {
    sendMock.mockResolvedValue({ reply: 'Ferdig!', configuration, sources: {} });
    render(<ConfigurationChat definition={interviewer} template={template} profile={null} />);

    await sendMessage('Ja, det stemmer');

    expect(await screen.findByRole('button', { name: 'Lagre agent' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Navn på agenten/ })).toHaveValue(
      'Intervjuer for Butikkmedarbeider',
    );
  });

  it('shows the finished configuration, with what the counsellor added, before saving', async () => {
    const withAdditions = { ...configuration, tillegg: 'Snakk sakte og tydelig.' };
    sendMock.mockResolvedValue({ reply: 'Ferdig!', configuration: withAdditions, sources: {} });
    render(<ConfigurationChat definition={interviewer} template={template} profile={null} />);

    await sendMessage('Ja, det stemmer');

    const summary = await screen.findByRole('dialog', { name: 'Stemmer dette?' });
    expect(within(summary).getByText('Stilling').nextElementSibling).toHaveTextContent(
      'Butikkmedarbeider',
    );
    expect(within(summary).getByText('Tillegg').nextElementSibling).toHaveTextContent(
      'Snakk sakte og tydelig.',
    );
  });

  it('closes the confirmation to change something, and shows it again for a new configuration', async () => {
    sendMock.mockResolvedValue({ reply: 'Ferdig!', configuration, sources: {} });
    render(<ConfigurationChat definition={interviewer} template={template} profile={null} />);

    await sendMessage('Ja, det stemmer');
    await userEvent
      .setup()
      .click(await screen.findByRole('button', { name: 'Nei, jeg vil endre noe' }));

    // The pop-up fades out before it is gone.
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Stemmer dette?' })).not.toBeInTheDocument(),
    );

    await sendMessage('Bytt til andre intervju');
    expect(await screen.findByRole('dialog', { name: 'Stemmer dette?' })).toBeInTheDocument();
  });

  it('shows a short message in the chat instead of the KONFIGURASJON block', async () => {
    sendMock.mockResolvedValue({
      reply: 'KONFIGURASJON\nStilling: Butikkmedarbeider',
      configuration,
      sources: {},
    });
    render(<ConfigurationChat definition={interviewer} template={template} profile={null} />);

    await sendMessage('Nei, jeg er ferdig');

    expect(await screen.findByText(FINISHED_REPLY)).toBeInTheDocument();
    expect(screen.queryByText(/KONFIGURASJON/)).not.toBeInTheDocument();
  });

  it('opens the summary again after it was closed', async () => {
    sendMock.mockResolvedValue({ reply: 'Ferdig!', configuration, sources: {} });
    render(<ConfigurationChat definition={interviewer} template={template} profile={null} />);
    const user = userEvent.setup();

    await sendMessage('Nei, jeg er ferdig');
    await user.click(await screen.findByRole('button', { name: 'Nei, jeg vil endre noe' }));
    await user.click(await screen.findByRole('button', { name: 'Se oppsummeringen' }));

    expect(await screen.findByRole('dialog', { name: 'Stemmer dette?' })).toBeInTheDocument();
  });

  it('saves the agent with the sources the server sent with the configuration', async () => {
    const sources = { intervjuer: { kind: 'template' as const, id: 'teamleder' } };
    sendMock.mockResolvedValue({ reply: 'Ferdig!', configuration, sources });
    saveMock.mockResolvedValue('agent-1');
    render(<ConfigurationChat definition={interviewer} template={template} profile={profile} />);

    await sendMessage('Ja, det stemmer');
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Lagre agent' }));

    expect(saveMock).toHaveBeenCalledWith(
      'Intervjuer for Butikkmedarbeider',
      interviewer,
      configuration,
      sources,
      undefined,
      null,
    );
  });
});
