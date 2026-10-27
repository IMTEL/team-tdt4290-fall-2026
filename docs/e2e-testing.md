# End-to-end testing

<!-- How we run the app in a real browser with Playwright: setup, running, writing tests, CI and troubleshooting. The unit and component tests are in testing.md. -->

## Contents

- [What e2e tests are for](#what-e2e-tests-are-for)
- [Setup](#setup)
- [Running](#running)
- [How the tests run](#how-the-tests-run)
- [The mock backend](#the-mock-backend)
- [Where tests live](#where-tests-live)
- [Writing a test](#writing-a-test)
- [Accessibility](#accessibility)
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
| End-to-end         | Playwright         | Real browsers | Login, pages and flows across several pages, against a mock backend |
| Manual check       | You, before a demo | Your browser  | Real RAGdoll, Keycloak and IDUN, which automated tests do not reach |

Keep e2e tests few and focused on the main flows. Anything that can be tested in Vitest should be
tested there: it is faster and less flaky.

## Setup

Playwright is already in `devDependencies`, so `npm ci` installs it. The browsers are downloaded
separately, once per machine (and again after Playwright is upgraded):

```bash
npm ci
npx playwright install chromium   # enough for npm run test:e2e
npx playwright install            # all three, for npm run test:e2e:all
```

On Linux, add `--with-deps` to also install the system libraries the browsers need (CI does this).

## Running

```bash
npm run test:e2e                              # every test in Chromium, headless (about 30 s)
npm run test:e2e:all                          # every test in Chromium, Firefox and WebKit, as CI does
npm run test:e2e -- e2e/profiles.spec.ts      # one file
npm run test:e2e -- -g "log"                  # tests whose name matches
npx playwright test --ui                      # UI mode: pick tests, watch them run, time-travel
npx playwright test --headed                  # show the browser window
npx playwright test --debug                   # step through with the Playwright Inspector
npx playwright codegen localhost:3100         # record clicks into test code (start the servers first)
```

`npm run test:e2e` runs only Chromium, so it takes a third of the time on any machine. CI runs
all three browsers on every pull request, so a bug that only shows in Firefox or Safari is still
caught before merge. Run `npm run test:e2e:all` yourself when you change something browsers may
handle differently, such as CSS layout, forms or keyboard handling.

`npm run check` does **not** run the e2e tests. Run `npm run test:e2e` yourself when you change a
flow they cover.

## How the tests run

You don't need Docker, RAGdoll, Keycloak, `.env` or the IDUN key. `npm run test:e2e` starts two
servers itself (`webServer` in `playwright.config.ts`), runs the tests and stops them again:

| Server       | Port | What it is                                                                            |
| ------------ | ---- | ------------------------------------------------------------------------------------- |
| Mock backend | 8181 | `e2e/support/mock-backend.mjs`: a fake Keycloak and a fake RAGdoll in one             |
| The app      | 3100 | `npm run build && next start`, a production build with every variable set to the mock |

The app gets its environment variables from `playwright.config.ts`, and they win over `.env`. So
the e2e tests never touch your local RAGdoll or the real IDUN, even if `.env` is filled in.

The app runs on 3100, not 3000, so you can keep `npm run dev` running while you test. It is a
production build because Next.js does not allow a second `next dev` in the same project. The
build takes a minute or so; the tests themselves take seconds.

While you write tests, use UI mode: `npx playwright test --ui`. It builds and starts the servers
once and keeps them running, so every re-run takes seconds. Close it and open it again after you
change app code, so the app is rebuilt.

Locally, Playwright also reuses servers that are already running on 3100 and 8181 instead of
starting new ones. If you kill a run halfway, check that nothing is left on those ports, or the
next run tests an old build.

## The mock backend

`e2e/support/mock-backend.mjs` answers the same requests as Keycloak and RAGdoll, with the same
shapes, and keeps everything in memory. It uses only Node built-ins.

- **Login**: the mock Keycloak has no password form. Clicking **Logg inn** goes through the real
  NextAuth flow (redirect, code, signed ID token) and comes straight back, logged in as a **new
  user** called «Test Bruker N». Like the real RAGdoll, the mock takes Keycloak's ID token as the
  Bearer token on every request: it checks the signature, the audience and the expiry, and keeps no
  session of its own. An expired ID token is refreshed at the mock Keycloak's token endpoint.
- **Every login is a new user**, with no agents, templates or profiles. So each test starts from
  an empty account, and tests running in parallel never see each other's data. A test that needs
  data creates it, through the UI or through our own API with the helpers in
  `e2e/support/data.ts` (`createAgent`, `publishAgent`, `createTemplate`, `createProfile`).
- **Chat**: no LLM. Every reply from a saved agent is `Mock-svar: <the last message you sent>`.
  The interviewer is set up in the wizard on `/configure`, without a chat, so only the test chat
  talks to the mock this way.
- **What it does not check**: the mock trusts what it gets and does not know RAGdoll's rules. A
  test passing against the mock does not prove the real RAGdoll accepts the same request. That is
  what the [manual check](testing.md#manual-end-to-end-check) is for.

When the app starts calling a RAGdoll endpoint the mock does not have, the mock answers 404 with
`Mock backend has no <METHOD> <path>`, and the app shows its error message. Add the endpoint to
the mock, copying the request and response shapes from `src/server/ragdoll.ts`.

## Where tests live

In `e2e/`, named `*.spec.ts`, one file per flow or page:

| File                    | Covers                                                             |
| ----------------------- | ------------------------------------------------------------------ |
| `home.spec.ts`          | Start page, navbar links, theme toggle                             |
| `auth.spec.ts`          | Login, logout, protected pages, login errors                       |
| `agents.spec.ts`        | Agent list, agent page, edit, clone, delete, publish, hide         |
| `configure.spec.ts`     | The interviewer wizard: every step, publishing, testing and drafts |
| `templates.spec.ts`     | Create, edit, delete and use interviewer templates                 |
| `profiles.spec.ts`      | Create, edit, delete job seeker templates, form validation         |
| `test-chat.spec.ts`     | Testing an agent in the chat: greeting, sending, starting over     |
| `accessibility.spec.ts` | axe on every page, dialog, menu and error state, light and dark    |

Helpers and the mock backend are in `e2e/support/`: `auth.ts` logs in, `data.ts` creates test
data through our API, `configure.ts` clicks through the wizard on `/configure` (`goToFinish` goes
all the way to the last step), and `accessibility.ts` runs axe.

Vitest only picks up `src/**/*.test.{ts,tsx}`, and Playwright only looks in `e2e/`, so the two
never run each other's files.

## Writing a test

```ts
import { test, expect } from '@playwright/test';

import { logIn } from './support/auth';

test('a new user has no agents', async ({ page }) => {
  await logIn(page, '/browse-agents');

  await expect(page.getByText('Du har ingen agenter ennå.')).toBeVisible();
});
```

`page.goto` takes paths (`'/browse-agents'`); `baseURL` in the config adds the host. `logIn(page,
path)` logs in a new user through the login page and opens `path`. Leave it out for pages that
work without login.

- **Find elements the way a user would**: `getByRole`, `getByLabel`, `getByText`, with the
  Norwegian text shown in the UI. Avoid CSS selectors and MUI class names; they change.
- **Match names exactly**: write `getByRole('button', { name: 'Send', exact: true })`. Without
  `exact`, Playwright ignores case and matches any part of the name, so the test still passes
  when the button is renamed to «Sendd» or «Send inn». Use a regular expression when you mean a
  part on purpose, such as `{ name: /^Daglig leder/ }` for a card whose name goes on.
- **Use the `expect(...)` assertions that wait**: `toBeVisible`, `toHaveText`, `toHaveURL`. They
  retry until they pass or time out. Never use `page.waitForTimeout`.
- **Keep tests independent**: each test starts from a fresh browser context and must not depend
  on another test having run first. Tests run in parallel.
- **Test data**: create what the test needs in the test itself; every login starts empty. Use
  invented data. Never use real job seeker data, here or anywhere else in the repo.
- **No secrets**: never put the IDUN key, access keys or tokens in a test.
- Do not commit `test.only`; CI fails if it finds one (`forbidOnly`).

## Accessibility

`e2e/accessibility.spec.ts` runs [axe](https://github.com/dequelabs/axe-core) on every page and
on the states a user can open there: dialogs, dropdowns, form errors, the wizard's steps and the
chat. It checks WCAG
2.0, 2.1 and 2.2 at level A and AA (universell utforming requires 2.1 AA), once in the light and
once in the dark theme, since the colours differ. It runs only in Chromium: axe checks the page,
not the browser.

When you add a page, or a dialog, menu or error message, add a test for it:

```ts
test('delete profile dialog', async ({ page }) => {
  await logIn(page);
  await createProfile(page, { label: 'Profil A' });
  await page.goto('/profiles');
  await page.getByRole('button', { name: 'Slett Profil A', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expectNoAccessibilityViolations(page);
});
```

Open the state first and wait for it with an `expect`; axe only checks what is on the page.
`expectNoAccessibilityViolations` waits for animations to end, so a dialog that is still fading in
is not reported as low contrast.

A failure lists each problem with the rule, a link explaining it, the elements and why, for
example `Element has insufficient color contrast of 3.88 (foreground color: #e63946 ...)`. Fix
the problem in the app; don't turn the rule off. If a colour fails, see
[the design guide](design-guide.md#colours-and-contrast).

axe finds roughly a third of accessibility problems. It cannot tell whether a label makes sense,
whether the focus order is logical or whether a screen reader announces the chat well. Check
those by hand with the keyboard and a screen reader (VoiceOver: Cmd+F5) before a demo.

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

`.github/workflows/playwright.yml` runs on every push and pull request to `main`. It has one job
per browser (Chromium, Firefox and WebKit), and the three run side by side. Each job:

1. `npm ci`
2. `npx playwright install --with-deps <browser>`, only the browser that job runs
3. `npx playwright test --project=<browser>`, which builds the app, starts it and the mock backend,
   and runs every test in that browser
4. Uploads `playwright-report/` as an artifact named `playwright-report-<browser>`, kept for 30
   days, also when tests fail.

In CI, failed tests are retried twice, tests run on two workers, and `test.only` fails the run.
After 10 failed tests a job stops (`maxFailures`) and the rest are reported as not run: with
retries, a change that breaks many tests would otherwise run until the job's 20-minute timeout.
A failure in one browser does not cancel the others.

**When a run fails right after merging `main`**, the app has usually changed under the tests: a
new step, a renamed button. Run `npm run test:e2e` locally, see what the failures wait for, and
update the tests (or a helper in `e2e/support/`) to the new behaviour.

To see why a CI run failed: open the run on GitHub, download the `playwright-report-<browser>` artifact for the browser that failed,
unzip it and run `npx playwright show-report <unzipped folder>`. Failed tests that were retried
have a trace.

CI needs no secrets: every variable the app needs is set in `playwright.config.ts`, and points at
the mock backend. Tests that log in run in CI just as they do locally.

## Troubleshooting

| Problem                                                            | Fix                                                                                                                            |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `Executable doesn't exist at ...` / "browser not installed"        | Run `npx playwright install`. Needed after a fresh clone and after upgrading `@playwright/test`.                               |
| `Error: http://localhost:3100 is already used`                     | Something else runs on port 3100 or 8181, for example servers left over from a run that was killed. Stop it (`lsof -i :3100`). |
| The tests run old code                                             | Playwright reused a server left on port 3100. Stop it (`lsof -i :3100`), or reopen UI mode after code changes.                 |
| The app shows an error and the mock logs `Mock backend has no ...` | The app calls a RAGdoll endpoint the mock doesn't have yet. Add it (see [The mock backend](#the-mock-backend)).                |
| A test passes locally but fails in CI                              | Download the report artifact and open the trace. Usually a missing `await`, or an assertion that does not wait.                |
| A test fails only in WebKit or Firefox                             | Run it with `--project=webkit --headed` to watch it. Do not just delete the browser from the config.                           |
| Tests are slow while you work                                      | Run only the file you are working on, or use UI mode (`--ui`).                                                                 |
