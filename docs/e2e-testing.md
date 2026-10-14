# End-to-end testing

<!-- How we run the app in a real browser with Playwright: setup, running, writing tests, CI and troubleshooting. The unit and component tests are in testing.md. -->

## Contents

- [What e2e tests are for](#what-e2e-tests-are-for)
- [Setup](#setup)
- [Running](#running)
- [Testing our own app](#testing-our-own-app)
- [Where tests live](#where-tests-live)
- [Writing a test](#writing-a-test)
- [Reports and traces](#reports-and-traces)
- [CI](#ci)
- [Troubleshooting](#troubleshooting)

## What e2e tests are for

[Playwright](https://playwright.dev/) opens a real browser (Chromium, Firefox and WebKit), clicks
through the app and checks what the user sees. It complements the other two kinds of tests in
[`testing.md`](testing.md):

| Kind               | Tool               | Runs in       | Catches                                                             |
| ------------------ | ------------------ | ------------- | ------------------------------------------------------------------- |
| Unit and component | Vitest + jsdom     | Node, no app  | Logic and single components, with RAGdoll and auth mocked           |
| End-to-end         | Playwright         | Real browsers | Pages, routing and flows across several pages, in the running app   |
| Manual check       | You, before a demo | Your browser  | Real RAGdoll, Keycloak and IDUN, which automated tests do not reach |

Keep e2e tests few and focused on the main flows. Anything that can be tested in Vitest should be
tested there: it is faster and less flaky.

## Setup

Playwright is already in `devDependencies`, so `npm ci` installs it. The browsers are downloaded
separately, once per machine (and again after Playwright is upgraded):

```bash
npm ci
npx playwright install            # Chromium, Firefox and WebKit
npx playwright install chromium   # or only Chromium, if that is all you run
```

On Linux, add `--with-deps` to also install the system libraries the browsers need (CI does this).

## Running

```bash
npm run test:e2e                              # every test, in all three browsers, headless
npx playwright test --project=chromium        # one browser only: much faster while you work
npx playwright test tests/example.spec.ts     # one file
npx playwright test -g "has title"            # tests whose name matches
npx playwright test --ui                      # UI mode: pick tests, watch them run, time-travel
npx playwright test --headed                  # show the browser window
npx playwright test --debug                   # step through with the Playwright Inspector
npx playwright codegen http://localhost:3000  # record clicks into test code
```

`npm run check` does **not** run the e2e tests. Run `npm run test:e2e` yourself when you change a
flow they cover.

## Testing our own app

Right now `tests/example.spec.ts` is the example Playwright generates, and it visits
`playwright.dev`, not our app. `playwright.config.ts` has no `baseURL` and no `webServer` yet,
so Playwright does not start the app for you.

To run tests against our app today:

1. Start the app in one terminal: `npm run dev` (or `npm run build && npm run start`).
2. In the test, go to the full URL: `await page.goto('http://localhost:3000/')`.
3. Run the tests in another terminal.

Once we uncomment `baseURL` and `webServer` in `playwright.config.ts`, Playwright starts the app
itself (and reuses one that is already running locally), and tests can use relative paths like
`page.goto('/browse-agents')`. Update this section when that happens.

Pages behind login (`/configure`, `/browse-agents`, `/test-chat` ...) need Keycloak and RAGdoll
running locally, as described in the [README](../README.md). The start page works without them.

## Where tests live

In `tests/`, named `*.spec.ts`, e.g. `tests/browse-agents.spec.ts`. One file per flow or page.

Vitest only picks up `src/**/*.test.{ts,tsx}`, and Playwright only looks in `tests/`, so the two
never run each other's files.

## Writing a test

```ts
import { test, expect } from '@playwright/test';

test('start page shows the heading', async ({ page }) => {
  await page.goto('http://localhost:3000/');

  await expect(
    page.getByRole('heading', { name: 'Konfigurator for intervjuagenter' }),
  ).toBeVisible();
});
```

- **Find elements the way a user would**: `getByRole`, `getByLabel`, `getByText`, with the
  Norwegian text shown in the UI. Avoid CSS selectors and MUI class names; they change.
- **Use the `expect(...)` assertions that wait**: `toBeVisible`, `toHaveText`, `toHaveURL`. They
  retry until they pass or time out. Never use `page.waitForTimeout`.
- **Keep tests independent**: each test starts from a fresh browser context and must not depend
  on another test having run first. Tests run in parallel.
- **Test data**: log in as the local test user `test@example.com` / `test`, or create what you
  need in the test. Never use real job seeker data, here or anywhere else in the repo.
- **No secrets**: never put the IDUN key, access keys or tokens in a test.
- Do not commit `test.only`; CI fails if it finds one (`forbidOnly`).

## Reports and traces

After a run, Playwright writes:

- `playwright-report/`: an HTML report. Open it with `npx playwright show-report`.
- `test-results/`: screenshots, videos and traces of failed tests.

Both are in `.gitignore`.

A trace is a recording of the run: every action, the DOM before and after, network requests and
console output. It is recorded on the first retry of a failed test (`trace: 'on-first-retry'`).
Locally there are no retries, so to get a trace run:

```bash
npx playwright test --trace on
npx playwright show-report   # click a test, then the trace
```

## CI

`.github/workflows/playwright.yml` runs on every push and pull request to `main`:

1. `npm ci`
2. `npx playwright install --with-deps`
3. `npx playwright test`
4. Uploads `playwright-report/` as an artifact named `playwright-report`, kept for 30 days, also
   when tests fail.

In CI, failed tests are retried twice, tests run one at a time (`workers: 1`), and `test.only`
fails the run.

To see why a CI run failed: open the run on GitHub, download the `playwright-report` artifact,
unzip it and run `npx playwright show-report <unzipped folder>`. Failed tests that were retried
have a trace.

The workflow has no `.env`, RAGdoll or Keycloak, so tests that need login or the backend cannot
pass in CI yet. Keep those out of CI (for example with `test.skip(!!process.env.CI, '...')`)
until we decide how to provide a backend there.

## Troubleshooting

| Problem                                                     | Fix                                                                                                             |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `Executable doesn't exist at ...` / "browser not installed" | Run `npx playwright install`. Needed after a fresh clone and after upgrading `@playwright/test`.                |
| `net::ERR_CONNECTION_REFUSED` at `localhost:3000`           | The app is not running. Start `npm run dev` first (see [Testing our own app](#testing-our-own-app)).            |
| A test passes locally but fails in CI                       | Download the report artifact and open the trace. Usually a missing `await`, or an assertion that does not wait. |
| A test fails only in WebKit or Firefox                      | Run it with `--project=webkit --headed` to watch it. Do not just delete the browser from the config.            |
| Tests are slow while you work                               | Use `--project=chromium` and run only the file you are working on.                                              |
