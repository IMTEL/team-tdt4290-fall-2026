/** Which template groups are open. Kept in the browser, so a closed group stays closed after a restart. */
const STORAGE_KEY = 'kfi-template-sections';

export const TEMPLATE_SECTIONS = ['bransjemaler', 'jobbsokerprofiler', 'stillingsmaler'] as const;

export type TemplateSectionId = (typeof TEMPLATE_SECTIONS)[number];

const listeners = new Set<() => void>();

function read(): Record<TemplateSectionId, boolean> {
  const open = {
    bransjemaler: true,
    jobbsokerprofiler: true,
    stillingsmaler: true,
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return open;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    for (const id of TEMPLATE_SECTIONS) {
      if (typeof parsed[id] === 'boolean') open[id] = parsed[id];
    }
  } catch {
    // Private mode, or a value this page did not write. Leave every group open.
  }
  return open;
}

/** Whether this group is open. Groups the browser has not stored yet are open. */
export function sectionOpen(id: TemplateSectionId): boolean {
  if (typeof window === 'undefined') return true;
  return read()[id];
}

/** Remembers whether this group is open, for the next visit in this browser. */
export function setSectionOpen(id: TemplateSectionId, open: boolean) {
  const next = { ...read(), [id]: open };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  listeners.forEach((listener) => listener());
}

export function subscribeSections(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
