import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import Home from './page';

describe('/', () => {
  it('offers a new agent and the agent list', () => {
    render(<Home />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Lag AI-intervjuere for jobbsøkere' }),
    ).toBeVisible();
    expect(
      screen.getByText(
        'Sett opp en intervjuer, test den i en chat og publiser den til VR-appen The Candidate.',
      ),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'Ny agent' })).toHaveAttribute(
      'href',
      '/configure?type=interviewer',
    );
    expect(screen.getByRole('link', { name: 'Se agentene dine' })).toHaveAttribute(
      'href',
      '/browse-agents',
    );
    expect(screen.queryByText(/Fortsett der du slapp/)).not.toBeInTheDocument();
  });

  it('explains the three steps, and links the test step to the chat', () => {
    render(<Home />);

    expect(screen.getByRole('heading', { level: 2, name: 'Slik fungerer det' })).toBeVisible();
    expect(screen.getByRole('heading', { level: 3, name: 'Lag en agent' })).toBeVisible();
    expect(screen.getByRole('heading', { level: 3, name: 'Du kan teste agenten' })).toBeVisible();
    expect(screen.getByRole('heading', { level: 3, name: 'Publiser agenten' })).toBeVisible();
    expect(
      screen.getByRole('link', {
        name: 'Trykk på "Test agenten" og snakk med agenten slik en jobbsøker ville gjort.',
      }),
    ).toHaveAttribute('href', '/test-chat');
    expect(screen.getByRole('link', { name: 'Maler' })).toHaveAttribute('href', '/templates');
    expect(screen.getByRole('link', { name: 'Jobbsøkerprofiler' })).toHaveAttribute(
      'href',
      '/profiles',
    );
  });
});
