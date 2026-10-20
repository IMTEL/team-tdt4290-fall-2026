import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import TemplatesPage, { metadata } from './page';

vi.mock('@/components/profiles/api', () => ({
  fetchProfiles: vi.fn(() => new Promise(() => {})),
}));

describe('/templates', () => {
  it('titles the page Maler', () => {
    render(<TemplatesPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Maler' })).toBeVisible();
    expect(metadata.title).toBe('Maler');
  });
});
