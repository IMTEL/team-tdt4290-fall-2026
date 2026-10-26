import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ProfilesPage, { metadata } from './page';

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockResolvedValue(Response.json({ profiles: [] }));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe('/profiles', () => {
  it('explains profiles, says they are private, and links to making a new one', async () => {
    render(<ProfilesPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Jobbsøkermaler' })).toBeVisible();
    expect(screen.getByText(/Bare du ser malene dine/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Lag en ny mal' })).toHaveAttribute(
      'href',
      '/profiles/new',
    );
    expect(await screen.findByText(/Du har ingen maler ennå/)).toBeInTheDocument();
  });

  it('sets a Norwegian tab title', () => {
    expect(metadata.title).toBe('Jobbsøkermaler');
  });
});
