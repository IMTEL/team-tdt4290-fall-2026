import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { builtInLegalTemplates } from '@/data/legal-templates';
import { templatesSectionHref } from '@/app/templates/sectionOpen';
import { LegalTemplateSelect } from './LegalTemplateSelect';

describe('LegalTemplateSelect', () => {
  it('sends Administrer lovverk to the lovverk group on Maler', () => {
    render(
      <LegalTemplateSelect templates={builtInLegalTemplates} value={[]} onChange={() => {}} />,
    );

    expect(screen.getByRole('link', { name: 'Administrer lovverk' })).toHaveAttribute(
      'href',
      templatesSectionHref('lovverk'),
    );
  });

  it('offers the standard template as one choice, not each paragraph', () => {
    render(
      <LegalTemplateSelect templates={builtInLegalTemplates} value={[]} onChange={() => {}} />,
    );

    expect(
      screen.getByRole('checkbox', { name: 'Rettigheter i ansettelsesprosessen' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Norge' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('checkbox', { name: 'Likestillings- og diskrimineringsloven § 30' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/Vil du vrake noen, lag et eget lovverk/)).toBeInTheDocument();
  });
});
