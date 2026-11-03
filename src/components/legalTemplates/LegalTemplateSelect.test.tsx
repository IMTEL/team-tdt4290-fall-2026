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
});
