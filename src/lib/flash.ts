// One-shot notes a page leaves for the next one, such as «Agent lagret» after a redirect. They live
// in sessionStorage, and reading one clears it. Without storage (private mode, full storage) the
// note is skipped; the page still works.

/** Leaves a note under `key` for the next page. */
export function setFlash(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // No storage: skip the note.
  }
}

/** Reads and clears the note under `key`, or null if there is none. */
export function takeFlash(key: string): string | null {
  try {
    const value = sessionStorage.getItem(key);
    if (value !== null) sessionStorage.removeItem(key);
    return value;
  } catch {
    return null;
  }
}
