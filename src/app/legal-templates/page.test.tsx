import { describe, expect, it, vi } from 'vitest';

import { templatesSectionHref } from '@/app/templates/sectionOpen';
import LegalTemplatesPage from './page';

vi.mock('next/navigation', () => ({ redirect: vi.fn() }));

describe('/legal-templates', () => {
  it('opens the lovverk group on Maler', async () => {
    const { redirect } = await import('next/navigation');
    LegalTemplatesPage();
    expect(redirect).toHaveBeenCalledWith(templatesSectionHref('lovverk'));
  });
});
