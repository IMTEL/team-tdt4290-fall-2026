import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { interviewerTemplates } from '@/data/interviewer-templates';
import { TemplatePicker } from './TemplatePicker';

describe('TemplatePicker', () => {
  it('shows every template with its description', () => {
    render(<TemplatePicker templates={interviewerTemplates} onSelect={vi.fn()} />);

    for (const template of interviewerTemplates) {
      expect(screen.getByRole('heading', { level: 3, name: template.title })).toBeVisible();
      expect(screen.getByText(template.description)).toBeVisible();
    }
  });

  it('calls onSelect with the clicked template', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<TemplatePicker templates={interviewerTemplates} onSelect={onSelect} />);

    await user.click(screen.getByRole('button', { name: /HR-medarbeider/ }));

    expect(onSelect).toHaveBeenCalledWith(
      interviewerTemplates.find((t) => t.id === 'hr-medarbeider'),
    );
  });

  it('calls onSelect with null to continue without a template', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<TemplatePicker templates={interviewerTemplates} onSelect={onSelect} />);

    await user.click(screen.getByRole('button', { name: 'Fortsett uten mal' }));

    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('links to the page for making a new template', () => {
    render(<TemplatePicker templates={interviewerTemplates} onSelect={vi.fn()} />);

    expect(screen.getByRole('link', { name: 'Lag en ny mal' })).toHaveAttribute(
      'href',
      '/create-template',
    );
  });

  it('starts a new template with the agent type, and shows the type’s lead', () => {
    render(
      <TemplatePicker
        templates={interviewerTemplates}
        onSelect={vi.fn()}
        agentType="interviewer"
        lead="Malen bestemmer intervjueren."
      />,
    );

    expect(screen.getByRole('link', { name: 'Lag en ny mal' })).toHaveAttribute(
      'href',
      '/create-template?agentType=interviewer',
    );
    expect(screen.getByText('Malen bestemmer intervjueren.')).toBeVisible();
  });

  it('shows saved templates after the built-in ones, with edit and delete only on them', () => {
    const saved = {
      id: 'saved-1',
      agentType: 'interviewer',
      title: 'Min mal',
      description: 'Lagret av meg.',
      focus: [],
      persona: 'Hen er butikksjef.',
    };
    render(
      <TemplatePicker
        templates={interviewerTemplates}
        savedTemplates={[saved]}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getAllByRole('listitem').at(-1)).toHaveTextContent('Min mal');
    expect(screen.getByRole('link', { name: 'Rediger Min mal' })).toHaveAttribute(
      'href',
      '/templates/saved-1/edit',
    );
    expect(screen.getAllByRole('link', { name: /^Rediger/ })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: /^Slett/ })).toHaveLength(1);
  });

  it('opens editing from the focus pills on a saved template', async () => {
    const saved = {
      id: 'saved-1',
      agentType: 'interviewer',
      title: 'Min mal',
      description: 'Lagret av meg.',
      focus: ['Service'],
      persona: 'Intervjueren er butikksjef.',
    };
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <TemplatePicker
        templates={interviewerTemplates}
        savedTemplates={[saved]}
        onSelect={onSelect}
        returnTo="/configure?type=interviewer&step=intervjuer"
      />,
    );

    const pill = screen.getByRole('link', { name: 'Service: rediger Min mal' });
    expect(pill).toHaveAttribute(
      'href',
      '/templates/saved-1/edit?returnTo=%2Fconfigure%3Ftype%3Dinterviewer%26step%3Dintervjuer',
    );
    await user.click(pill);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('opens the built-in template from its focus pills', () => {
    render(<TemplatePicker templates={interviewerTemplates} onSelect={vi.fn()} />);

    expect(screen.getByRole('link', { name: 'Motivasjon: se Daglig leder' })).toHaveAttribute(
      'href',
      '/templates/daglig-leder',
    );
  });

  it('shows the interviewer text on the card and in a hover tip', async () => {
    const user = userEvent.setup();
    render(<TemplatePicker templates={interviewerTemplates} onSelect={vi.fn()} />);

    expect(screen.getByText(/Intervjueren er daglig leder i en mindre bedrift/)).toBeVisible();
    await user.hover(screen.getByRole('heading', { level: 3, name: 'Daglig leder' }));
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      /Intervjueren er daglig leder i en mindre bedrift/,
    );
  });

  it('sends Rediger back to the wizard that opened the picker', () => {
    const saved = {
      id: 'saved-1',
      agentType: 'interviewer',
      title: 'Min mal',
      description: 'Lagret av meg.',
      focus: [],
      persona: 'Hen er butikksjef.',
    };
    render(
      <TemplatePicker
        templates={interviewerTemplates}
        savedTemplates={[saved]}
        onSelect={vi.fn()}
        returnTo="/configure?type=interviewer&step=intervjuer"
      />,
    );

    expect(screen.getByRole('link', { name: 'Rediger Min mal' })).toHaveAttribute(
      'href',
      '/templates/saved-1/edit?returnTo=%2Fconfigure%3Ftype%3Dinterviewer%26step%3Dintervjuer',
    );
    expect(screen.getAllByRole('link', { name: /^Rediger/ })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: /^Slett/ })).toHaveLength(1);
  });
});
