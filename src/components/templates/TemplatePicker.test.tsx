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
});
