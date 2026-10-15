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
npx playwright install            # Chromium, Firefox and WebKit
npx playwright install chromium   # or only Chromium, if that is all you run
```

On Linux, add `--with-deps` to also install the system libraries the browsers need (CI does this).

## Running

```bash
npm run test:e2e                              # every test, in all three browsers, headless
npx playwright test --project=chromium        # one browser only: much faster while you work
npx playwright test tests/profiles.spec.ts    # one file
npx playwright test -g "log"                  # tests whose name matches
npx playwright test --ui                      # UI mode: pick tests, watch them run, time-travel
npx playwright test --headed                  # show the browser window
npx playwright test --debug                   # step through with the Playwright Inspector
npx playwright codegen localhost:3100         # record clicks into test code (start the servers first)
```

`npm run check` does **not** run the e2e tests. Run `npm run test:e2e` yourself when you change a
flow they cover.

## How the tests run

You don't need Docker, RAGdoll, Keycloak, `.env` or the IDUN key. `npm run test:e2e` starts two
servers itself (`webServer` in `playwright.config.ts`), runs the tests and stops them again:

| Server       | Port | What it is                                                                            |
| ------------ | ---- | ------------------------------------------------------------------------------------- |
| Mock backend | 8181 | `tests/support/mock-backend.mjs`: a fake Keycloak and a fake RAGdoll in one           |
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

`tests/support/mock-backend.mjs` answers the same requests as Keycloak and RAGdoll, with the same
shapes, and keeps everything in memory. It uses only Node built-ins.

- **Login**: the mock Keycloak has no password form. Clicking **Logg inn** goes through the real
  NextAuth flow (redirect, code, signed ID token, RAGdoll `/api/login`) and comes straight back,
  logged in as a **new user** called «Test Bruker N».
- **Every login is a new user**, with no agents, templates or profiles. So each test starts from
  an empty account, and tests running in parallel never see each other's data. A test that needs
  data creates it, through the UI or through our own API with the helpers in
  `tests/support/data.ts` (`createAgent`, `createTemplate`, `createProfile`).
- **Chat**: no LLM. Every reply, from the configurator or a saved agent, is
  `Mock-svar: <the last message you sent>`. To finish the configurator chat, send it a
  `KONFIGURASJON` block (`configurationBlock()` in `tests/support/data.ts`): the reply echoes it,
  and the app reads it as a finished configuration.
- **What it does not check**: the mock trusts what it gets and does not know RAGdoll's rules. A
  test passing against the mock does not prove the real RAGdoll accepts the same request. That is
  what the [manual check](testing.md#manual-end-to-end-check) is for.

When the app starts calling a RAGdoll endpoint the mock does not have, the mock answers 404 with
`Mock backend has no <METHOD> <path>`, and the app shows its error message. Add the endpoint to
the mock, copying the request and response shapes from `src/server/ragdoll.ts`.

## Where tests live

In `tests/`, named `*.spec.ts`, one file per flow or page:

| File                | Covers                                                            |
| ------------------- | ----------------------------------------------------------------- |
| `home.spec.ts`      | Start page, navbar links, theme toggle                            |
| `auth.spec.ts`      | Login, logout, protected pages, login errors                      |
| `agents.spec.ts`    | Agent list, agent page, edit (with presets), clone, delete        |
| `configure.spec.ts` | Configurator: template and profile choice, chat, saving the agent |
| `templates.spec.ts` | Create, edit, delete and use interviewer templates                |
| `profiles.spec.ts`  | Create, edit, delete job seeker profiles, form validation         |
| `test-chat.spec.ts` | Testing an agent in the chat: greeting, sending, starting over    |

Helpers and the mock backend are in `tests/support/`: `auth.ts` logs in, `data.ts` creates test
data through our API.

Vitest only picks up `src/**/*.test.{ts,tsx}`, and Playwright only looks in `tests/`, so the two
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
- **Use the `expect(...)` assertions that wait**: `toBeVisible`, `toHaveText`, `toHaveURL`. They
  retry until they pass or time out. Never use `page.waitForTimeout`.
- **Keep tests independent**: each test starts from a fresh browser context and must not depend
  on another test having run first. Tests run in parallel.
- **Test data**: create what the test needs in the test itself; every login starts empty. Use
  invented data. Never use real job seeker data, here or anywhere else in the repo.
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
3. `npm run test:e2e`, which builds the app and starts it and the mock backend
4. Uploads `playwright-report/` as an artifact named `playwright-report`, kept for 30 days, also
   when tests fail.

In CI, failed tests are retried twice, tests run one at a time (`workers: 1`), and `test.only`
fails the run.

To see why a CI run failed: open the run on GitHub, download the `playwright-report` artifact,
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
| Tests are slow while you work                                      | Use `--project=chromium` and run only the file you are working on.                                                             |
