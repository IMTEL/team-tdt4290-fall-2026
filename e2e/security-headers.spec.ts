import { test, expect } from '@playwright/test';

// The real server sends the headers from src/lib/securityHeaders.ts (OWASP WSTG-CONF-07,
// WSTG-CLNT-09, WSTG-CONF-12 and WSTG-CONF-14), on pages and on API routes alike.
for (const path of ['/', '/login', '/api/agents']) {
  test(`${path} sends the security headers`, async ({ request }) => {
    const res = await request.get(path, { maxRedirects: 0 });
    const headers = res.headers();

    expect(headers['strict-transport-security']).toContain('max-age=');
    expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['permissions-policy']).toBe('camera=(), microphone=(), geolocation=()');
  });
}
