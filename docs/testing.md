# Testing

<!-- What we test and how much: test levels, tools, what runs in CI, and what we verify by hand before a sprint demo. Feeds chapter 12 of the report. -->

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
npm run test        # run everything once (this is what CI runs)
npm run test:watch  # re-run on every save while you work
```

## Where tests live

Next to the code they test, named `*.test.ts` or `*.test.tsx`, e.g.
`src/components/chat/ChatInput.test.tsx`. Only files under `src/` are picked up.

Test behaviour through the public interface: render the component, interact with it, assert on
what the user sees. Avoid asserting on internal state, class names or private helpers. Nothing
calls the real RAGdoll: tests replace `fetch` (or `sendToAgent`) with a mock.

## What is covered so far

Unit and component level only:

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
- `src/app/configure/page.test.tsx`: smoke test for the heading, the chat and the tab title.

Not covered yet:

- No end-to-end tests in a real browser, and no integration tests against a real RAGdoll.
- Auto-scroll, visual appearance, dark mode and responsive layout are checked by hand.
- The agent's behaviour (does it ask one question at a time, in Norwegian) depends on its prompt
  in RAGdoll and is checked by hand.
