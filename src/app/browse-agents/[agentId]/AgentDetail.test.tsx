import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchAgents, publishAgent } from '../api';
import { setAgentHiddenFlash } from '../flash';
import { AgentDetail } from './AgentDetail';

const notFound = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({ notFound, useRouter: () => ({ push: vi.fn() }) }));
vi.mock('../api', () => ({ fetchAgents: vi.fn(), deleteAgent: vi.fn(), publishAgent: vi.fn() }));

const fetchAgentsMock = vi.mocked(fetchAgents);
const publishAgentMock = vi.mocked(publishAgent);

const configuration = {
  stilling: 'Barnehagelærer',
  bransje: 'Barnehage (offentlig)',
  bedrift: 'Ingen navn, verdier omsorg og lek',
  intervjutype: 'første intervju',
  intervjuer: 'leder, vennlig',
  jobbsoker: 'under 25, lite erfaring',
  vanskelighetsgrad: 'lett',
  egneSporsmal: 'ingen',
  tillegg: '',
};

const agent = {
  id: 'agent-1',
  name: 'Intervjuer for Barnehagelærer',
  description: JSON.stringify(configuration),
  lastUpdated: '2026-10-02T12:00:00.000Z',
  llmModel: 'openai/gpt-oss-120b',
  temperature: 0.3,
  prompt: 'Du er en intervjuer for en barnehage.',
};

/** The line under the agent's name, with the agent type and the date. */
async function headerMeta() {
  return (await screen.findByRole('heading', { level: 1 })).nextElementSibling;
}

describe('AgentDetail', () => {
  afterEach(() => {
    fetchAgentsMock.mockReset();
    notFound.mockClear();
    sessionStorage.clear();
  });

  it('says once that the agent was hidden from The Candidate because it was edited', async () => {
    fetchAgentsMock.mockResolvedValue([agent]);
    setAgentHiddenFlash('agent-1');

    const { unmount } = render(<AgentDetail agentId="agent-1" />);

    expect(
      await screen.findByText(/Agenten er gjemt fra The Candidate fordi den ble endret/),
    ).toBeVisible();
    unmount();

    render(<AgentDetail agentId="agent-1" />);
    await screen.findByRole('heading', { name: agent.name });
    expect(screen.queryByText(/fordi den ble endret/)).not.toBeInTheDocument();
  });

  it('removes the note when the agent is published again', async () => {
    fetchAgentsMock.mockResolvedValue([agent]);
    publishAgentMock.mockResolvedValue({
      isPublished: true,
      publicName: agent.name,
      publicDescription: '',
    });
    setAgentHiddenFlash('agent-1');
    const user = userEvent.setup();

    render(<AgentDetail agentId="agent-1" />);
    await screen.findByText(/fordi den ble endret/);
    await user.click(screen.getByRole('button', { name: 'Publiser' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Publiser' }));

    await waitFor(() => expect(screen.queryByText(/fordi den ble endret/)).not.toBeInTheDocument());
  });

  it('does not show the note on another agent’s page', async () => {
    fetchAgentsMock.mockResolvedValue([agent]);
    setAgentHiddenFlash('agent-2');

    render(<AgentDetail agentId="agent-1" />);

    await screen.findByRole('heading', { name: agent.name });
    expect(screen.queryByText(/fordi den ble endret/)).not.toBeInTheDocument();
  });

  it('opens on the configuration tab', async () => {
    fetchAgentsMock.mockResolvedValue([agent]);

    render(<AgentDetail agentId="agent-1" />);

    expect(await screen.findByRole('heading', { name: agent.name })).toBeVisible();
    expect(screen.getByRole('tab', { name: 'Konfigurasjon' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    const panel = screen.getByRole('tabpanel', { name: 'Konfigurasjon' });
    expect(panel).toBeVisible();
    expect(within(panel).getByText('Stilling').nextElementSibling).toHaveTextContent(
      'Barnehagelærer',
    );
    expect(within(panel).getByText('Bransje').nextElementSibling).toHaveTextContent(
      'Barnehage (offentlig)',
    );
    expect(screen.queryByText('Språkmodell')).not.toBeInTheDocument();
    expect(screen.queryByText(/Du er en intervjuer/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Test agenten' })).toHaveAttribute(
      'href',
      '/test-chat?agent=agent-1',
    );
  });

  it('shows the advanced settings and the system prompt on their own tabs', async () => {
    fetchAgentsMock.mockResolvedValue([agent]);
    const user = userEvent.setup();

    render(<AgentDetail agentId="agent-1" />);

    await user.click(await screen.findByRole('tab', { name: 'Avanserte innstillinger' }));

    expect(screen.getByText('Språkmodell').nextElementSibling).toHaveTextContent(
      'openai/gpt-oss-120b',
    );
    expect(screen.getByText('Temperatur').nextElementSibling).toHaveTextContent('0,3');
    expect(within(screen.getByRole('tabpanel')).queryByText('Stilling')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Systemprompt' }));

    // The prompt RAGdoll has stored, not one built again from the answers.
    expect(screen.getByText('Du er en intervjuer for en barnehage.')).toBeVisible();
    expect(screen.queryByText('Skrevet for hånd')).not.toBeInTheDocument();
    expect(screen.queryByText('Språkmodell')).not.toBeInTheDocument();
  });

  it('moves between the tabs with the arrow keys', async () => {
    fetchAgentsMock.mockResolvedValue([agent]);
    const user = userEvent.setup();

    render(<AgentDetail agentId="agent-1" />);

    await user.click(await screen.findByRole('tab', { name: 'Konfigurasjon' }));
    await user.keyboard('{ArrowRight}');

    expect(screen.getByRole('tab', { name: 'Avanserte innstillinger' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByText('Språkmodell')).toBeVisible();
  });

  it('shows the actions between the summary and the tabs', async () => {
    fetchAgentsMock.mockResolvedValue([agent]);

    render(<AgentDetail agentId="agent-1" />);

    const summary = await screen.findByRole('region', { name: 'Oppsummering' });
    const testLink = screen.getByRole('link', { name: 'Test agenten' });
    const tabs = screen.getByRole('tablist', { name: 'Agentdetaljer' });
    expect(
      summary.compareDocumentPosition(testLink) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(testLink.compareDocumentPosition(tabs) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('links back to the list of agents', async () => {
    fetchAgentsMock.mockResolvedValue([agent]);

    render(<AgentDetail agentId="agent-1" />);

    expect(await screen.findByRole('link', { name: 'Tilbake til agentene' })).toHaveAttribute(
      'href',
      '/browse-agents',
    );
  });

  it('shows the shape of the page while the agent loads', () => {
    fetchAgentsMock.mockReturnValue(new Promise(() => {}));

    render(<AgentDetail agentId="agent-1" />);

    expect(screen.getByRole('status', { name: 'Laster agent' })).toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });

  it('points only the open tab to its panel, since the other panels are not rendered', async () => {
    fetchAgentsMock.mockResolvedValue([agent]);
    const user = userEvent.setup();

    render(<AgentDetail agentId="agent-1" />);

    const configTab = await screen.findByRole('tab', { name: 'Konfigurasjon' });
    const promptTab = screen.getByRole('tab', { name: 'Systemprompt' });
    expect(configTab).toHaveAttribute('aria-controls', screen.getByRole('tabpanel').id);
    expect(promptTab).not.toHaveAttribute('aria-controls');

    await user.click(promptTab);

    expect(promptTab).toHaveAttribute('aria-controls', screen.getByRole('tabpanel').id);
    expect(configTab).not.toHaveAttribute('aria-controls');
  });

  it('encodes the agent id in the edit and clone links', async () => {
    fetchAgentsMock.mockResolvedValue([{ ...agent, id: 'a/b?c' }]);

    render(<AgentDetail agentId="a/b?c" />);

    expect(await screen.findByRole('link', { name: 'Rediger' })).toHaveAttribute(
      'href',
      '/browse-agents/a%2Fb%3Fc/edit',
    );
    expect(screen.getByRole('link', { name: 'Klon' })).toHaveAttribute(
      'href',
      '/browse-agents/a%2Fb%3Fc/clone',
    );
  });

  describe('copying the system prompt', () => {
    it('copies the stored prompt and says so', async () => {
      fetchAgentsMock.mockResolvedValue([agent]);
      // user-event puts a fake clipboard on navigator.clipboard.
      const user = userEvent.setup();

      render(<AgentDetail agentId="agent-1" />);

      await user.click(await screen.findByRole('tab', { name: 'Systemprompt' }));
      await user.click(screen.getByRole('button', { name: 'Kopier' }));

      expect(await navigator.clipboard.readText()).toBe('Du er en intervjuer for en barnehage.');
      expect(await screen.findByText('Kopiert')).toBeVisible();
    });

    it('tells the counsellor to copy by hand when the browser refuses', async () => {
      fetchAgentsMock.mockResolvedValue([agent]);
      const user = userEvent.setup();
      vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'));

      render(<AgentDetail agentId="agent-1" />);

      await user.click(await screen.findByRole('tab', { name: 'Systemprompt' }));
      await user.click(screen.getByRole('button', { name: 'Kopier' }));

      expect(
        await screen.findByText('Kunne ikke kopiere. Marker teksten og kopier den selv.'),
      ).toBeVisible();
    });

    it('is not offered when the agent has no prompt', async () => {
      fetchAgentsMock.mockResolvedValue([{ ...agent, prompt: '' }]);
      const user = userEvent.setup();

      render(<AgentDetail agentId="agent-1" />);

      await user.click(await screen.findByRole('tab', { name: 'Systemprompt' }));

      expect(screen.queryByRole('button', { name: 'Kopier' })).not.toBeInTheDocument();
      // Nothing to show above the prompt, so the row is left out instead of leaving a gap.
      expect(screen.getByRole('tabpanel').children).toHaveLength(1);
    });
  });

  describe('the summary', () => {
    it('is shown above the configuration', async () => {
      fetchAgentsMock.mockResolvedValue([agent]);

      render(<AgentDetail agentId="agent-1" />);

      const summary = await screen.findByRole('region', { name: 'Oppsummering' });
      expect(summary).toHaveTextContent(
        'Dette er en intervjuer for stillingen barnehagelærer i bransjen barnehage (offentlig). ' +
          'Det er et første intervju med vanskelighetsgrad lett. ' +
          'Jobbsøkeren er beskrevet slik: under 25, lite erfaring.',
      );
      // The summary comes before the first field of the list.
      const panel = screen.getByRole('tabpanel', { name: 'Konfigurasjon' });
      expect(
        summary.compareDocumentPosition(within(panel).getByText('Stilling')) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it('leaves out the sentences that have no answers', async () => {
      const description = JSON.stringify({ ...configuration, jobbsoker: '', intervjutype: '' });
      fetchAgentsMock.mockResolvedValue([{ ...agent, description }]);

      render(<AgentDetail agentId="agent-1" />);

      const summary = await screen.findByRole('region', { name: 'Oppsummering' });
      expect(within(summary).getByText(/^Dette er en intervjuer/)).toHaveTextContent(
        /barnehage \(offentlig\)\. Vanskelighetsgraden er lett\.$/,
      );
      expect(summary).not.toHaveTextContent('Jobbsøkeren er beskrevet');
    });

    it('says which answers shape the interviewer, and how', async () => {
      fetchAgentsMock.mockResolvedValue([agent]);

      render(<AgentDetail agentId="agent-1" />);

      const effects = await screen.findByRole('region', {
        name: 'Slik former svarene dine agenten',
      });
      expect(within(effects).getByText('Vanskelighetsgrad').nextElementSibling).toHaveTextContent(
        'Enkle og åpne spørsmål, og en tålmodig intervjuer.',
      );
      // «ingen» own questions change nothing, so they are not listed.
      expect(within(effects).queryByText('Egne spørsmål')).not.toBeInTheDocument();
      // In a box of its own, under the summary.
      const summary = screen.getByRole('region', { name: 'Oppsummering' });
      expect(summary).not.toContainElement(effects);
      expect(
        summary.compareDocumentPosition(effects) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it('says the answers change nothing when the prompt was written by hand', async () => {
      const description = JSON.stringify({
        type: 'interviewer',
        version: 1,
        answers: configuration,
        customPrompt: true,
      });
      fetchAgentsMock.mockResolvedValue([{ ...agent, description }]);

      render(<AgentDetail agentId="agent-1" />);

      const effects = await screen.findByRole('region', {
        name: 'Slik former svarene dine agenten',
      });
      expect(effects).toHaveTextContent(
        'Systemprompten er skrevet for hånd, så svarene endrer ikke hvordan agenten oppfører seg.',
      );
      expect(within(effects).queryByText('Vanskelighetsgrad')).not.toBeInTheDocument();
    });

    it('is left out for an agent that was not made in this app', async () => {
      fetchAgentsMock.mockResolvedValue([{ ...agent, description: 'En vanlig beskrivelse' }]);

      render(<AgentDetail agentId="agent-1" />);

      expect(await screen.findByText('En vanlig beskrivelse')).toBeVisible();
      expect(screen.queryByRole('region', { name: 'Oppsummering' })).not.toBeInTheDocument();
      expect(
        screen.queryByRole('region', { name: 'Slik former svarene dine agenten' }),
      ).not.toBeInTheDocument();
    });
  });

  it('shows the agent’s avatar next to its name', async () => {
    fetchAgentsMock.mockResolvedValue([{ ...agent, avatar: 'ugle' }]);

    const { container } = render(<AgentDetail agentId="agent-1" />);

    const heading = await screen.findByRole('heading', { name: agent.name });
    const image = container.querySelector('img');
    expect(image).toHaveAttribute('src', '/avatars/ugle.svg');
    // The name sits in a block with the type and the date, and the avatar is next to that block.
    expect(heading.parentElement?.parentElement).toContainElement(image);
  });

  it.each([
    ['has no avatar', null],
    ['was saved before avatars existed', undefined],
    ['has an avatar we no longer have', 'fjernet-avatar'],
  ])('shows the default image when the agent %s', async (_, avatar) => {
    fetchAgentsMock.mockResolvedValue([{ ...agent, avatar }]);

    const { container } = render(<AgentDetail agentId="agent-1" />);

    await screen.findByRole('heading', { name: agent.name });
    expect(container.querySelector('img')).toHaveAttribute('src', '/avatars/default.svg');
  });

  it('shows an agent saved in the new format, with type and version', async () => {
    fetchAgentsMock.mockResolvedValue([
      {
        ...agent,
        description: JSON.stringify({ type: 'interviewer', version: 1, answers: configuration }),
      },
    ]);

    render(<AgentDetail agentId="agent-1" />);

    const panel = await screen.findByRole('tabpanel', { name: 'Konfigurasjon' });
    expect(within(panel).getByText('Stilling').nextElementSibling).toHaveTextContent(
      'Barnehagelærer',
    );
    expect(screen.queryByText(/"type":"interviewer"/)).not.toBeInTheDocument();
  });

  it('shows the agent type', async () => {
    fetchAgentsMock.mockResolvedValue([
      {
        ...agent,
        description: JSON.stringify({ type: 'interviewer', version: 1, answers: configuration }),
      },
    ]);

    render(<AgentDetail agentId="agent-1" />);

    expect(await headerMeta()).toHaveTextContent(/^Agenttype:\s*Intervjuer/);
  });

  it('shows an agent saved before agent types existed as an interviewer', async () => {
    // `agent` has only the answers in its description, the way agents were saved then.
    fetchAgentsMock.mockResolvedValue([agent]);

    render(<AgentDetail agentId="agent-1" />);

    expect(await headerMeta()).toHaveTextContent(/^Agenttype:\s*Intervjuer/);
  });

  it('shows no type for an agent that was not made in this app', async () => {
    fetchAgentsMock.mockResolvedValue([{ ...agent, description: 'En vanlig beskrivelse' }]);

    render(<AgentDetail agentId="agent-1" />);

    expect(await screen.findByText('En vanlig beskrivelse')).toBeVisible();
    expect(await headerMeta()).not.toHaveTextContent('Intervjuer');
  });

  it('shows when the agent was last changed, as a Norwegian date', async () => {
    fetchAgentsMock.mockResolvedValue([agent]);

    render(<AgentDetail agentId="agent-1" />);

    expect(await headerMeta()).toHaveTextContent('Sist endret 2.10.2026');
  });

  it('leaves out the date when RAGdoll sends something that is not a date', async () => {
    fetchAgentsMock.mockResolvedValue([{ ...agent, lastUpdated: 'undefined' }]);

    render(<AgentDetail agentId="agent-1" />);

    expect(await headerMeta()).not.toHaveTextContent('Sist endret');
    expect(screen.queryByText(/Invalid Date/)).not.toBeInTheDocument();
  });

  it('marks a hand-written system prompt', async () => {
    fetchAgentsMock.mockResolvedValue([
      {
        ...agent,
        description: JSON.stringify({
          type: 'interviewer',
          version: 1,
          answers: configuration,
          customPrompt: true,
        }),
      },
    ]);

    const user = userEvent.setup();

    render(<AgentDetail agentId="agent-1" />);

    await user.click(await screen.findByRole('tab', { name: 'Systemprompt' }));

    expect(screen.getByText('Skrevet for hånd')).toBeVisible();
  });

  it('shows the default temperature for an agent saved without one', async () => {
    fetchAgentsMock.mockResolvedValue([{ ...agent, temperature: null }]);
    const user = userEvent.setup();

    render(<AgentDetail agentId="agent-1" />);

    await user.click(await screen.findByRole('tab', { name: 'Avanserte innstillinger' }));

    expect(screen.getByText('Temperatur').nextElementSibling).toHaveTextContent('0,7');
  });

  it('links to the edit page', async () => {
    fetchAgentsMock.mockResolvedValue([agent]);

    render(<AgentDetail agentId="agent-1" />);

    expect(await screen.findByRole('link', { name: 'Rediger' })).toHaveAttribute(
      'href',
      '/browse-agents/agent-1/edit',
    );
  });

  it('links to the clone page', async () => {
    fetchAgentsMock.mockResolvedValue([agent]);

    render(<AgentDetail agentId="agent-1" />);

    expect(await screen.findByRole('link', { name: 'Klon' })).toHaveAttribute(
      'href',
      '/browse-agents/agent-1/clone',
    );
  });

  it('does not offer to clone an agent that was not made in this app', async () => {
    fetchAgentsMock.mockResolvedValue([{ ...agent, description: 'En vanlig beskrivelse' }]);

    render(<AgentDetail agentId="agent-1" />);

    expect(await screen.findByRole('link', { name: 'Test agenten' })).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Klon' })).not.toBeInTheDocument();
  });

  it('calls notFound when the id is not in the list', async () => {
    fetchAgentsMock.mockResolvedValue([agent]);

    render(<AgentDetail agentId="missing" />);

    await waitFor(() => expect(notFound).toHaveBeenCalled());
  });
});
