# Security

<!-- Threat model, assets worth protecting, countermeasures, and how we handle personal data (no real job seeker data). Feeds chapter 11 of the report. -->

What we protect, from whom, and how. The design behind most of it (the browser only talks to our
server, RAGdoll stores everything) is in [`architecture.md`](architecture.md) and
[decision 0004](decisions/0004-stateless-backend-for-frontend.md).

## Contents

- [What we protect](#what-we-protect)
- [Countermeasures](#countermeasures)
- [Personal data](#personal-data)
- [Known gaps](#known-gaps)
- [When you change something](#when-you-change-something)

## What we protect

| Asset                                               | Why it matters                                                                                  | Where it lives                                                     |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| The project's IDUN key (`IDUN_API_KEY`)             | Anyone with it can use NTNU's language models on the project's account                          | Our server's environment; RAGdoll keeps a copy on each saved agent |
| Access keys of the shared configurator and observer | Anyone with them can chat with those agents directly, outside our rate limit                    | Our server's environment                                           |
| The counselor's login (Keycloak ID token)           | Anyone with it can read, change, publish and delete the counselor's agents                      | NextAuth's encrypted cookie in the browser                         |
| Counselors' agents, templates and profiles          | A counselor must not see or change another counselor's work                                     | RAGdoll (MongoDB)                                                  |
| What a counselor writes about a job seeker          | Even without names, notes about a job seeker must not leak to The Candidate or other counselors | RAGdoll (job seeker profiles, and the answers in an agent)         |
| The Candidate's client key                          | It lets anyone list published agents and chat with them and with the observer                   | RAGdoll's and The Candidate's environment. This app never sees it  |

## Countermeasures

### Secrets stay on the server

- No environment variable has the `NEXT_PUBLIC_` prefix, so none is bundled into browser code.
  The full list is in [Secrets and configuration](architecture.md#secrets-and-configuration).
- The browser never calls RAGdoll. Each route under `src/app/api/` calls RAGdoll itself and returns
  only the fields the page needs. RAGdoll's copy of the IDUN key and the agents' access keys are
  dropped before an answer leaves our server, and tests check this
  (`src/app/api/agents/route.test.ts`, `src/app/api/agents/[agentId]/chat/route.test.ts`).
- The test chat fetches a fresh chat key for the agent on every turn, server-side. The browser never
  sends or receives an access key.
- `.env` is git-ignored, and `.env.example` holds only dummy values.

### Login and sessions

- Login is Keycloak's, through NextAuth (`src/lib/auth-options.ts`). Passwords never pass through
  our app.
- The tokens are kept in NextAuth's cookie, encrypted with `NEXTAUTH_SECRET`. The browser's session
  only shows the user's name and picture.
- The ID token is short-lived (Keycloak's access token lifespan, 5 minutes by default) and is
  refreshed at Keycloak. The session ends when the refresh token expires.
- Logging out also ends the Keycloak session, so the next **Logg inn** asks for the password again
  ([Logging out](architecture.md#logging-out)).
- `src/proxy.ts` sends signed-out users to `/login` before the pages that need RAGdoll. Every API
  route checks the session again itself and answers 401 without calling RAGdoll.

### One counselor cannot reach another's data

- RAGdoll checks the ID token on every request and only returns the user's own agents, templates
  and profiles.
- Before changing or deleting an agent, our route checks that its id is in the user's own list, so
  someone else's agent gives 404 and nothing is written.
- Deleting, publishing, hiding and editing a published agent need the owner. A collaborator gets
  403 (`isAgentOwner` in `src/server/ragdoll.ts`).
- The e2e tests log in as a new user for every test, and the manual checks in
  [`testing.md`](testing.md) cover two users explicitly.

### Input is checked on the server

- Every route parses its body itself and answers 400 when it is not what it expects. There is no
  generic proxy to RAGdoll.
- Lengths are limited on the server, not only in the form: template fields (`TEMPLATE_LIMITS`),
  legal templates, job seeker profiles, the public name (80) and description (300), a hand-written
  system prompt (20,000 characters), and the observer transcript (40,000 characters, 413 above).
- IDs are always URL-encoded before they are put into a RAGdoll URL
  (`encodeURIComponent` in `src/server/ragdoll.ts`). The chat and rating routes also check that the
  agent id looks like a MongoDB ID, and answer 404 without calling RAGdoll when it does not.
- The chosen language model must be one RAGdoll lists, the temperature must be between 0 and 1.5,
  and the max tokens a whole number from 256 to 8000. Higher values let one reply run until the
  chat times out (#132).

### Rate limit on chat messages

Each counselor may send at most 30 chat messages a minute, configuration chat, test chat and
observer together (`src/server/rateLimit.ts`). Above that the route answers 429 with
`Retry-After`, and RAGdoll and IDUN are not called. This protects the project's IDUN quota from a
stuck script or a runaway browser tab.

### Security headers

Every response gets the headers in `src/lib/securityHeaders.ts` (wired in `next.config.ts`), each
tied to a test in the OWASP Web Security Testing Guide: HSTS, a Content Security Policy that forbids
framing, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, a strict referrer policy, and a
permissions policy that turns off camera, microphone and location. `e2e/security-headers.spec.ts`
checks them on real responses.

### Errors do not leak details

RAGdoll's own error text is never forwarded to the browser. Each failure becomes a status and a
fixed English message on the server, and a Norwegian message in the page
([Error handling](architecture.md#error-handling)).

### Language model output is not trusted blindly

- The observer must quote the job seeker's answers in the test chat (where the counselor plays the
  job seeker). A point whose quote is not at least three whole words from those answers, in a row,
  is dropped (`src/domain/observerFeedback.ts`).
- The prompt built from the answers tells the interviewer to stay in role, never ask for personal
  data, and never ask about or judge protected characteristics such as gender, age, health,
  religion or ethnicity.

### Dependencies

Known vulnerabilities in our packages are patched in their own pull request, for example #119,
which updated Next.js and patched the packages `npm audit` reported. Run `npm audit` after
changing dependencies.

## Personal data

- **No real job seeker data**, in the app, in tests or in demo agents. The forms and the
  configurator ask only for coarse, non-identifying traits: age group, experience, education,
  language level and what to practise.
- **Job seeker profiles are private to the counselor**, and their notes never reach an agent:
  only the profile's description fills in `Jobbsøker`. The manual check in
  [`testing.md`](testing.md#manual-check-job-seeker-templates) searches for the note text in every
  agent.
- **The Candidate gets only the public name and description** of a published agent. It cannot
  read the prompt, the answers or the role names: RAGdoll only accepts its client key for the list
  of published agents and for chatting ([decision 0003](decisions/0003-publish-to-the-candidate.md)).
  The publish dialog warns «Ikke skriv noe om jobbsøkeren her».
- **Editing a published agent hides it**, so a job seeker never meets a version nobody has tested.
  Ratings are the exception; see [Known gaps](#known-gaps).
- **Chats are not stored by us.** The whole history is sent on every turn and kept only in the
  page. Ratings of test chat replies are stored in RAGdoll with the agent.
- **The counselor's own profile** (name, email, picture) is stored in RAGdoll's user settings.

## Known gaps

- **Ratings change a published agent without hiding it.** Every rating, and its comment, is
  written into the agent's prompt at once (`syncAgentPromptWithFeedback` in
  `src/server/feedbackPrompt.ts`), and the agent stays published. A careless comment reaches job
  seekers in The Candidate without a new test. The comment text is also not checked for personal
  data before it goes into the prompt.
- **A hand-written system prompt has no guardrails.** The form reminds the counselor, but the
  rules of the built prompt are not added to it ([Advanced settings](architecture.md#advanced-settings)).
- **The rate limit lives in the server's memory.** It resets when the server restarts, and is
  counted per server instance if the app ever runs on more than one.
- **One client key for all of The Candidate.** Anyone who extracts it from the app can list
  published agents and chat with them, and with the observer agent. That is accepted because
  published agents hold no personal data, and the observer only judges the transcript it is sent;
  see decision 0003.
- **The Content Security Policy only covers framing, base URI and plugins.** It does not yet limit
  where scripts may load from, because MUI and Next.js inline styles and scripts would need nonces.

## When you change something

- A new API route checks the session first, parses its own body, and returns only what the page
  needs. See [Add an API route](extending.md#add-an-api-route-that-calls-ragdoll).
- A new secret goes in `.env.example` with a dummy value, without `NEXT_PUBLIC_`, and in the table
  in [`architecture.md`](architecture.md#secrets-and-configuration).
- If a secret is ever committed, tell the team and rotate it. Removing the commit is not enough.
