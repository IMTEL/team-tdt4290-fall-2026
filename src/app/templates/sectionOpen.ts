/** Which template groups are open. Kept in the browser, so a closed group stays closed after a restart. */
const STORAGE_KEY = 'kfi-template-sections';

export const TEMPLATE_SECTIONS = [
  'bransjemaler',
  'jobbsokerprofiler',
  'stillingsmaler',
  'intervjuermaler',
  'lovverk',
] as const;

export type TemplateSectionId = (typeof TEMPLATE_SECTIONS)[number];

/** The query that opens one group on /templates and jumps to where that group sits. */
export const TEMPLATES_SECTION_PARAM = 'seksjon';

export function templatesSectionHref(id: TemplateSectionId): string {
  return `/templates?${TEMPLATES_SECTION_PARAM}=${id}#${id}`;
}

export function parseTemplateSection(value: string | null | undefined): TemplateSectionId | null {
  return TEMPLATE_SECTIONS.includes(value as TemplateSectionId)
    ? (value as TemplateSectionId)
    : null;
}

/** The group named in `?seksjon=` or `#…`, or null if the URL does not name one. */
export function sectionFromLocation(
  location: Pick<Location, 'search' | 'hash'>,
): TemplateSectionId | null {
  const fromQuery = parseTemplateSection(
    new URLSearchParams(location.search).get(TEMPLATES_SECTION_PARAM),
  );
  if (fromQuery) return fromQuery;
  return parseTemplateSection(location.hash.replace(/^#/, ''));
}

const listeners = new Set<() => void>();

function read(): Record<TemplateSectionId, boolean> {
  const open = {
    bransjemaler: true,
    jobbsokerprofiler: true,
    stillingsmaler: true,
    intervjuermaler: true,
    lovverk: true,
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

function write(next: Record<TemplateSectionId, boolean>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  listeners.forEach((listener) => listener());
}

/** Remembers whether this group is open, for the next visit in this browser. */
export function setSectionOpen(id: TemplateSectionId, open: boolean) {
  write({ ...read(), [id]: open });
}

export function subscribeSections(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
