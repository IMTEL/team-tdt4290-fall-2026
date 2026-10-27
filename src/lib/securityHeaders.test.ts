import { describe, expect, it } from 'vitest';

import nextConfig from '../../next.config';
import { securityHeaders } from './securityHeaders';

/** The headers as a plain object, by name. */
const byName = Object.fromEntries(securityHeaders.map(({ key, value }) => [key, value]));

describe('securityHeaders', () => {
  it('has the values the OWASP testing guide recommends', () => {
    expect(byName['Strict-Transport-Security']).toMatch(/^max-age=\d{8,}; includeSubDomains$/);
    expect(byName['Content-Security-Policy']).toContain("frame-ancestors 'none'");
    expect(byName['X-Frame-Options']).toBe('DENY');
    expect(byName['X-Content-Type-Options']).toBe('nosniff');
    expect(byName['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(byName['Permissions-Policy']).toBe('camera=(), microphone=(), geolocation=()');
  });

  it('sends each header once', () => {
    const names = securityHeaders.map(({ key }) => key.toLowerCase());

    expect(new Set(names).size).toBe(names.length);
  });

  it('is sent on every page and API route', async () => {
    expect(await nextConfig.headers?.()).toEqual([{ source: '/:path*', headers: securityHeaders }]);
  });
});
