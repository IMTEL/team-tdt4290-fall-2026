// Headers sent with every response (see next.config.ts). They turn on protections the browser has
// but does not use by default. Each one is checked by a test in the OWASP Web Security Testing
// Guide (WSTG), named next to it.

const TWO_YEARS_IN_SECONDS = 63_072_000;

export const securityHeaders: { key: string; value: string }[] = [
  // WSTG-CONF-07: only HTTPS from now on. Browsers ignore it on plain http://localhost.
  {
    key: 'Strict-Transport-Security',
    value: `max-age=${TWO_YEARS_IN_SECONDS}; includeSubDomains`,
  },
  // WSTG-CLNT-09 and WSTG-CONF-12: no other site may show our pages in a frame (clickjacking), the
  // page may not change its base URL, and no plugins.
  {
    key: 'Content-Security-Policy',
    value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'",
  },
  // WSTG-CONF-14: the same rule as frame-ancestors, for older browsers.
  { key: 'X-Frame-Options', value: 'DENY' },
  // WSTG-CONF-14: the browser must not guess a file's type and run it as a script.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // WSTG-CONF-14: other sites only see our domain, not URLs with agent ids.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // WSTG-CONF-14: the app uses no camera, microphone or location, so no page may ask for them.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];
