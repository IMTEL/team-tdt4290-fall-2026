/** A path on this site. Anything else is dropped so the link cannot leave the app. */
export function returnPath(value: string | string[] | undefined): string | null {
  const path = Array.isArray(value) ? value[0] : value;
  if (!path || !path.startsWith('/') || path.startsWith('//') || path.includes('\\')) return null;
  return path;
}

/** Adds `?returnTo=` when `to` is a path on this site. */
export function withReturnTo(href: string, to: string | undefined): string {
  const path = returnPath(to);
  if (!path) return href;
  const url = new URL(href, 'http://local');
  url.searchParams.set('returnTo', path);
  return `${url.pathname}${url.search}${url.hash}`;
}
