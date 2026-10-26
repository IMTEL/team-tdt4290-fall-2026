import { useState, useSyncExternalStore } from 'react';

/** True after hydration, so browser storage can be read without a server/client HTML mismatch. */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

/**
 * Runs `run` once, in the browser after hydration, during render: for reading a one-shot note
 * (see src/lib/flash.ts) and showing it straight away. `run` may set the component's own state.
 */
export function useOnceInBrowser(run: () => void): void {
  const isClient = useIsClient();
  const [done, setDone] = useState(false);
  if (isClient && !done) {
    setDone(true);
    run();
  }
}
