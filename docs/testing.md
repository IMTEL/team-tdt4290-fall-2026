# Testing

<!-- What we test and how much: test levels, tools, what runs in CI, and what we verify by hand before a sprint demo. Feeds chapter 12 of the report. -->

## Contents

- [Tools](#tools)
- [Running](#running)
- [Where tests live](#where-tests-live)
- [What is covered so far](#what-is-covered-so-far)

## Tools

- [Vitest](https://vitest.dev/) runs the tests (`vitest.config.mts`).
- [Testing Library](https://testing-library.com/) (`@testing-library/react`, `user-event`,
  `jest-dom`) renders components and drives them the way a user would: find things by role and
  label, type, click, press keys.
- [jsdom](https://github.com/jsdom/jsdom) stands in for the browser. `vitest.setup.ts` registers
  the jest-dom matchers (`toBeInTheDocument`, `toBeDisabled`, ...) and cleans up after each test.
  Tests of server code (Route Handlers) opt out with `// @vitest-environment node`.

## Running

```bash
npm run test        # run every test once
npm run test:watch  # re-run on every save while you work
npm run check       # lint + format check + typecheck + tests: run this before pushing
```

CI runs lint, format check, typecheck, tests and build on every pull request
(`.github/workflows/ci.yml`); `npm run check` is the same minus the build.

## Where tests live

Next to the code they test, named `*.test.ts` or `*.test.tsx`, e.g.
`src/components/chat/ChatInput.test.tsx`. Only files under `src/` are picked up.

Test behaviour through the public interface: render the component, interact with it, assert on
what the user sees. Avoid asserting on internal state, class names or private helpers. Nothing
calls the real RAGdoll: tests replace `fetch` (or `sendToAgent`) with a mock.

## What is covered so far

Unit and component level only:

- `src/app/page.test.tsx`: smoke test for the start page's heading and introduction.
- `src/app/api/chat/route.test.ts`: the route forwards the history to RAGdoll with the agent id
  and access key from the environment and returns only the reply text; rejects invalid bodies
  (400) and missing settings (500) without calling RAGdoll; maps RAGdoll errors, unexpected
  replies and network failures to 502 without leaking RAGdoll's message, and timeouts to 504.
- `src/components/chat/sendToAgent.test.ts`: posts only `role` and `content`, passes the abort
  signal on, turns failures into Norwegian `ChatError` messages, and rethrows aborts untouched.
- `src/components/chat/ChatInput.test.tsx`: Enter and the button send the trimmed text and clear
  the box, Shift+Enter adds a new line, blank text and a disabled input never send.
- `src/components/chat/MessageList.test.tsx`: messages in order with a hidden speaker label, and
  the typing bubble only while the assistant answers.
- `src/app/configure/ConfigurationChat.test.tsx`: greeting, typing bubble and reply; the whole
  conversation (greeting included) is sent; friendly error, sending blocked, Retry resends the same
  history without repeating the user's message; no technical error text; leaving the page aborts
  the request.
- `src/components/templates/TemplatePicker.test.tsx`: every template is shown, clicking one
  selects it, and "Start uten mal" selects none.
- `src/app/configure/page.test.tsx`: smoke test for the heading, the chat, the link to the
  template picker and the tab title.
- `src/app/template-picker/page.test.tsx`: the templates and a link back to the chat; choosing a
  template (or none) shows the choice, and "Velg en annen mal" goes back to the picker.

Log in (Keycloak via NextAuth, with RAGdoll's own session tokens):

- `src/lib/auth-options.test.ts`: `hasExpired` with its 30 second margin; the `jwt` callback trades
  the Keycloak token for RAGdoll's tokens on first sign-in (ID token, else access token), keeps a
  valid token, refreshes an expired one and ends the session when the refresh token has expired;
  a rejected login or missing `BACKEND_API_URL` fails the sign-in; the `session` callback exposes
  name and picture but never the tokens.
- `src/lib/session-tokens.test.ts`: `getSessionToken` returns null when signed out, returns a valid
  token, refreshes an expired one for the request, and returns null when refresh is impossible or
  fails.
- `src/lib/auth.test.ts`: log in and create account call Keycloak with the callback URL (create
  account with `prompt: 'create'`); log out calls `/api/logout`, clears the NextAuth session and
  goes to Keycloak's logout URL, falling back to `/login` when the logout route fails.
- `src/app/api/logout/route.test.ts`: revokes RAGdoll's token, builds the Keycloak logout URL with
  the ID token hint (or client id) and the way back to `/login`, and still logs out of Keycloak
  when RAGdoll cannot be reached.
- `src/app/api/backend/[...path]/route.test.ts`: forwards method, path, query and body to RAGdoll
  with the session token; 401 when signed out, 500 without `BACKEND_API_URL`, 502 when RAGdoll
  cannot be reached, and RAGdoll's own status codes passed through.
- `src/components/login/LoginButtons.test.tsx` and `src/app/login/page.test.tsx`: the buttons log
  in or sign up and return to `callbackUrl`; the page shows an error for `?error` and sends
  signed-in users to `/`.
- `src/components/login/LogInPageButton.test.tsx`: nothing while the session loads, a "Log in" link
  (marked current on `/login`) when signed out, and the user's name with a working "Log out" button
  when signed in.

Not covered yet:

- No end-to-end tests in a real browser, and no integration tests against a real RAGdoll.
- Auto-scroll, visual appearance, dark mode and responsive layout are checked by hand.
- The agent's behaviour (does it ask one question at a time, in Norwegian) depends on its prompt
  in RAGdoll and is checked by hand.
