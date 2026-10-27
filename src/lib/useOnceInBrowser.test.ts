import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useIsClient, useOnceInBrowser } from './useOnceInBrowser';

describe('useIsClient', () => {
  it('is true in the browser', () => {
    const { result } = renderHook(() => useIsClient());

    expect(result.current).toBe(true);
  });
});

describe('useOnceInBrowser', () => {
  it('runs once, however often the component renders', () => {
    const run = vi.fn();

    const { rerender } = renderHook(() => useOnceInBrowser(run));
    rerender();
    rerender();

    expect(run).toHaveBeenCalledTimes(1);
  });
});
