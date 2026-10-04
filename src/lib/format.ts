/**
 * Formats an ISO date as a Norwegian date, e.g. "15.1.2026". The locale and the time zone are
 * fixed, so the server and the browser print the same text whatever their own settings are.
 */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('nb-NO', { timeZone: 'Europe/Oslo' });
}
