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

    expect(screen.getByRole('heading', { level: 1, name: 'Jobbsøkerprofiler' })).toBeVisible();
    expect(screen.getByText(/Bare du ser profilene dine/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Lag en ny profil' })).toHaveAttribute(
      'href',
      '/profiles/new',
    );
    expect(await screen.findByText(/Du har ingen profiler ennå/)).toBeInTheDocument();
  });

  it('sets a Norwegian tab title', () => {
    expect(metadata.title).toBe('Jobbsøkerprofiler');
  });
});
