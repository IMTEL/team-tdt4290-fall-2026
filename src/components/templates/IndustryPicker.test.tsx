import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { industryTemplates } from '@/data/industry-templates';
import { IndustryPicker } from './IndustryPicker';

describe('IndustryPicker', () => {
  it('shows every template with its industry, sector and description', () => {
    render(<IndustryPicker templates={industryTemplates} onSelect={vi.fn()} />);

    for (const template of industryTemplates) {
      expect(screen.getByRole('heading', { level: 3, name: template.title })).toBeVisible();
      expect(screen.getByText(template.description)).toBeVisible();
    }
    expect(screen.getByText('Helse og omsorg · Offentlig')).toBeVisible();
    expect(screen.getByText('Varehandel · Privat')).toBeVisible();
  });

  it('calls onSelect with the clicked template', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<IndustryPicker templates={industryTemplates} onSelect={onSelect} />);

    await user.click(screen.getByRole('button', { name: /Butikkmedarbeider/ }));

    expect(onSelect).toHaveBeenCalledWith(
      industryTemplates.find((t) => t.id === 'butikkmedarbeider'),
    );
  });

  it('calls onSelect with null to continue without an industry template', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<IndustryPicker templates={industryTemplates} onSelect={onSelect} />);

    await user.click(screen.getByRole('button', { name: 'Fortsett uten bransjemal' }));

    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('shows only public or only private jobs when filtered by sector', async () => {
    const user = userEvent.setup();
    render(<IndustryPicker templates={industryTemplates} onSelect={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Offentlig' }));

    expect(screen.getByRole('heading', { level: 3, name: 'Helsefagarbeider' })).toBeVisible();
    expect(
      screen.queryByRole('heading', { level: 3, name: 'Butikkmedarbeider' }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Privat' }));

    expect(screen.getByRole('heading', { level: 3, name: 'Butikkmedarbeider' })).toBeVisible();
    expect(
      screen.queryByRole('heading', { level: 3, name: 'Helsefagarbeider' }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Alle' }));

    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(industryTemplates.length);
  });
});
