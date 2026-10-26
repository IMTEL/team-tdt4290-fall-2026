import { afterEach, describe, expect, it, vi } from 'vitest';

import { setFlash, takeFlash } from './flash';

afterEach(() => {
  vi.restoreAllMocks();
  sessionStorage.clear();
});

describe('setFlash and takeFlash', () => {
  it('gives the note once, then null', () => {
    setFlash('note', 'agent-lagret');

    expect(takeFlash('note')).toBe('agent-lagret');
    expect(takeFlash('note')).toBeNull();
  });

  it('keeps notes under different keys apart', () => {
    setFlash('first', 'a');
    setFlash('second', 'b');

    expect(takeFlash('second')).toBe('b');
    expect(takeFlash('first')).toBe('a');
  });

  it('skips the note without failing when there is no storage', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('private mode');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('private mode');
    });

    expect(() => setFlash('note', 'a')).not.toThrow();
    expect(takeFlash('note')).toBeNull();
  });
});
