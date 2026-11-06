# Testing

<!-- What we test and how much: test levels, tools, what runs in CI, and what we verify by hand before a sprint demo. Feeds chapter 12 of the report. -->

## Contents

- [Tools](#tools)
- [Running](#running)
- [Where tests live](#where-tests-live)
- [What is covered so far](#what-is-covered-so-far)
- [Manual end-to-end check](#manual-end-to-end-check)
- [Manual check: job seeker templates](#manual-check-job-seeker-templates)

## Tools

- [Vitest](https://vitest.dev/) runs the tests (`vitest.config.mts`).
- [Testing Library](https://testing-library.com/) (`@testing-library/react`, `user-event`,
  `jest-dom`) renders components and drives them the way a user would: find things by role and
  label, type, click, press keys.
- [jsdom](https://github.com/jsdom/jsdom) stands in for the browser. `vitest.setup.ts` registers
  the jest-dom matchers (`toBeInTheDocument`, `toBeDisabled`, ...) and cleans up after each test.
  Tests of server code (Route Handlers) opt out with `// @vitest-environment node`.
- Each test may take up to 15 seconds (`testTimeout` in `vitest.config.mts`). MUI forms in jsdom
  are slow when many test files run at once, and the default of 5 seconds made tests time out on
  busy machines.
- [Playwright](https://playwright.dev/) runs end-to-end tests in real browsers
  (`npm run test:e2e`). Setup, running and writing them: [`e2e-testing.md`](e2e-testing.md).

## Running

```bash
npm run test        # run every test once
npm run test:watch  # re-run on every save while you work
npm run check       # lint + format check + typecheck + tests: run this before pushing
```

CI runs lint, format check, typecheck, tests and build on every pull request
(`.github/workflows/ci.yml`), and the end-to-end tests in three browsers
(`.github/workflows/playwright.yml`). `npm run check` is the same as `ci.yml` minus the build.

## Where tests live

Next to the code they test, named `*.test.ts` or `*.test.tsx`, e.g.
`src/components/chat/ChatInput.test.tsx`. Only files under `src/` are picked up.

Test behaviour through the public interface: render the component, interact with it, assert on
what the user sees. Avoid asserting on internal state, class names or private helpers. Nothing
calls the real RAGdoll: tests replace `fetch`, the RAGdoll adapter or the login with a mock.

## What is covered so far

About 125 test files, by area. This section says what each area's tests protect, not every test:
to see every test by name, run `npx vitest list`, or read the `describe` and `it` texts in the
file next to the code. When you add a test file, check that its area below still describes it.

| Area                       | Where the tests are                                                                                                                                                                      | What they make sure of                                                                                                                                                                                                                                                                                                                                                                                      |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Start page                 | `src/app/page.test.tsx`                                                                                                                                                                  | The heading, «Slik fungerer det» and the links to Ny agent, Agenter and Maler                                                                                                                                                                                                                                                                                                                               |
| Help page                  | `src/app/help/page.test.tsx`, `src/app/configure/StillingStep.test.tsx`                                                                                                                  | Every entry in the contents leads to its section, every wizard section has its own part at its anchor, no anchor is used twice, and each wizard section links to its part                                                                                                                                                                                                                                   |
| The wizard on `/configure` | `src/app/configure/` (`page`, `wizardConfiguration`, `wizardDraft`, `LeaveWizardGuard`, `templatePeeks`, `api`)                                                                          | The agent type comes first, planned types can't be chosen; the six steps, jumping back, and what is required; the answers built from the choices (with a sentence for what was skipped); saving, publishing and testing from Fullføre; several drafts side by side, old drafts moved past AI-innstillinger; asking before leaving without saving; what each template bubble shows (never a profile's notes) |
| Agent types and prompts    | `src/domain/agentTypes/`, `src/domain/interviewerPrompt`, `interviewerAdaptations`, `interviewerSummary`, `difficulty`, `agentName`                                                      | Every registered type has a label, unique fields, presets that name its own fields, and a prompt, roles and name; answers are stored with type and version, and old agents read as interviewers; every rule in «Slik former svarene dine agenten» is also in the prompt                                                                                                                                     |
| Agents: list and details   | `src/app/browse-agents/`, `src/components/agents/`, `src/domain/agentList`, `agentFilters`, `agentStatus`, `avatars`, `advancedSettings`, `publication`                                  | Cards, sections, search and filters; draft cards; the details page with summary, answers, advanced settings and prompt tabs; editing, cloning, deleting, publishing and hiding; model and temperature checks; the public name and description limits                                                                                                                                                        |
| Test chat and observer     | `src/app/test-chat/`, `src/components/chat/`, `src/domain/observerFeedback`, `interviewerFeedbackPrompt`, `src/server/feedbackMapper`, `feedbackPrompt`                                  | Sending only `role` and `content`, retry without repeating the message, aborting when the page is left; rating a reply and undoing it; the observer's lines parsed, invented quotes dropped, points paired with the interviewer's question; the ratings written into the interviewer's prompt, summarised by the observer when there are many, and removed when every rating is undone                      |
| Templates                  | `src/app/templates/`, `src/app/create-template/`, `src/components/templates/`, `src/domain/templateCatalog`, `workplaceTemplate`, `src/server/templateMapper`, `workplaceTemplateMapper` | The Maler page and its sections; forms for intervjuer-, stillings- and bransjemaler with limits; built-in templates are read only; saving, editing and deleting own ones; only our own template types are read back from RAGdoll                                                                                                                                                                            |
| Job seeker profiles        | `src/app/profiles/`, `src/components/profiles/`, `src/domain/jobSeekerProfile`, `src/server/profileMapper`                                                                               | The forms, list and detail page; the Jobbsøker answer has every filled-in field but never the notes or the label                                                                                                                                                                                                                                                                                            |
| Legal templates            | `src/app/legal-templates/`, `src/components/legalTemplates/`, `src/data/legal-templates`, `src/domain/legalTemplate`, `src/server/legalTemplateMapper`                                   | The standard template has every Norwegian paragraph with a source; a new interviewer starts with it; old per-paragraph ticks still count as the standard template; an own template saves only the ticked paragraphs and the extra rule                                                                                                                                                                      |
| Min profil                 | `src/app/profile/`, `src/domain/counsellorProfile`, `src/app/api/user-settings/`                                                                                                         | Name, email and picture fall back to the login, a picture must be one of ours or an image, and saving keeps the other settings                                                                                                                                                                                                                                                                              |
| Login                      | `src/lib/auth-options`, `session-tokens`, `auth`, `src/app/api/logout/`, `src/components/login/`, `src/app/login/`                                                                       | Trading the Keycloak token for RAGdoll's, refreshing expired tokens, the session showing only name and picture, and logging out of RAGdoll and Keycloak                                                                                                                                                                                                                                                     |
| API routes                 | `src/app/api/**/route.test.ts`                                                                                                                                                           | Each route: 401 without a session, 400 for bad bodies, 404 for someone else's or unknown ids without writing anything, 403 for non-owners, and keys never in the answer                                                                                                                                                                                                                                     |
| Server and shared helpers  | `src/server/ragdoll`, `agentMapper`, `errorResponse`, `rateLimit`, `src/lib/securityHeaders`, `flash`, `returnTo`, `useOnceInBrowser`, `src/components/ui/`                              | The RAGdoll adapter against a mocked `fetch` (session token sent, errors mapped, API keys dropped); the agent sent to RAGdoll; 30 messages a minute per user with `Retry-After`; the security headers; `returnTo` never leaves the site                                                                                                                                                                     |

The end-to-end tests in a real browser are listed in
[`e2e-testing.md`](e2e-testing.md#where-tests-live).

Not covered by automated tests:

- Integration with a real RAGdoll, Keycloak and IDUN: the tests mock RAGdoll, and the end-to-end
  tests use a mock backend. The [manual end-to-end check](#manual-end-to-end-check) covers it.
- Visual appearance and responsive layout. Contrast and other WCAG rules are checked by axe in the
  end-to-end tests; the rest is checked by hand.
- How the agents behave (one question at a time, in Norwegian, staying in role) depends on the
  language model and is checked by hand in the test chat.

## Manual end-to-end check

Run this before a demo, and after changes to login, the interviewer wizard or saving. It uses the
real RAGdoll, Keycloak and IDUN, so it catches what the mocked tests cannot: a wrong environment
variable or a changed RAGdoll API.

Before you start: RAGdoll runs locally and `.env` is filled in as described in the README
(including `IDUN_API_KEY`). Restart `npm run dev` after changing `.env`.

| #   | Do this                                                                                                                             | You should see                                                                                                                      |
| --- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Open <http://localhost:3000/configure?type=interviewer> while logged out                                                            | You are sent to `/login`                                                                                                            |
| 2   | Log in as `test@example.com` / `test`                                                                                               | You land on the wizard at **Stilling og arbeidsplass**                                                                              |
| 3   | Fill in a stilling (and required workplace fields), go through Intervjuer → Jobbsøker → Innstillinger → AI-innstillinger → Fullføre | **Publiser**, **Lagre som privat agent** and **Test agenten** are available; overview shows what you chose                          |
| 4   | Keep or change the suggested name and click **Lagre som privat agent**                                                              | You go to `/browse-agents` with toast **Agent lagret**; the new agent is in the list                                                |
| 5   | In the browser console (F12), run `await (await fetch('/api/agents')).json()`                                                       | The new agent is in the list, with your configuration as JSON in `description`                                                      |
| 6   | Open the Network tab, repeat steps 3 to 5, and look at every request to `/api/*`                                                    | No response contains `llm_api_key`, `embedding_api_key`, an access key or a token                                                   |
| 7   | Start a new interviewer, fill only the first section, click **Lagre utkast**                                                        | Agenter shows an **Utkast** card; toast **Utkast lagret**; card opens `/configure?type=interviewer&draft=<id>` at the step you left |
| 8   | On the Utkast card, click **Slett**, confirm                                                                                        | The card is gone; with no other drafts, `localStorage` has no `kfi-configure-draft`                                                 |
| 9   | Log out, log in as a second user (register one on the login page), and repeat step 5                                                | The first user's agent is not in this list                                                                                          |
| 10  | Log in as the first user again, open the agent on `/browse-agents` and click **Rediger**                                            | The form shows the agent's name and answers                                                                                         |
| 11  | Change the name and one answer, and click **Lagre endringer**                                                                       | Back on the details page with the new values; the system prompt shows the new answer                                                |
| 12  | Repeat step 5                                                                                                                       | Same number of agents as before, with the same id: the agent was updated, not copied                                                |
| 13  | Stop RAGdoll, change an answer and save, then start RAGdoll again                                                                   | A Norwegian error, and the form still shows what you typed                                                                          |

If **Publiser** stays disabled or shows that required fields are missing, go back through the
section list and fill every marked field (stilling, arbeidsgiver, intervjutype, vanskelighetsgrad,
antall spørsmål, oppfølging).

## Manual check: job seeker templates

Run this after changes to jobbsøkermaler (`/profiles`), the Jobbsøker step on `/configure`, or how
`Jobbsøker` is stored on an agent. The unit tests mock RAGdoll, so only this shows that the mal is
stored, that notes never reach an agent, and that one counselor cannot see another's maler.

Before you start:

- RAGdoll exposes the profile endpoints with experience and practice areas.
- You can log in as two users (`test@example.com` / `test`, and one you register yourself).
- Jobbsøkermaler are not in the navbar; open `/profiles` directly or via **Maler** → Jobbsøkermaler
  / **Administrer maler** from the wizard.

Create, edit and keep private:

| #   | Do this                                                                                                                                                                                                                                                  | You should see                                                                                            |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1   | Open <http://localhost:3000/profiles> while logged out                                                                                                                                                                                                   | You are sent to `/login`                                                                                  |
| 2   | Log in as the first user and open `/profiles`                                                                                                                                                                                                            | "Du har ingen maler ennå …" (or your earlier maler); heading **Jobbsøkermaler**                           |
| 3   | Click **Lag en ny mal**                                                                                                                                                                                                                                  | An empty form; **Lagre mal** is disabled until **Navn på malen** has text                                 |
| 4   | In **Språk**, type 21 languages separated by commas                                                                                                                                                                                                      | "Skriv høyst 20 språk." and **Lagre mal** is disabled. Clear the field again                              |
| 5   | Fill in: name `Profil A`, age `18–24 år`, experience `Litt (under 1 år)`, `sommerjobb i butikk`, `videregående`, `Norsk B1, Arabisk`; tick **Mestre nervøsitet** and **Forklare hull i CV-en**; **Annet** `Snakke om lønn`; **Notater** `HEMMELIG-NOTAT` | "Malen «Profil A» er lagret." with a link to the maler                                                    |
| 6   | Follow the link                                                                                                                                                                                                                                          | A card for Profil A with "18–24 år · Litt (under 1 år)" and the three practice areas as chips             |
| 7   | Click **Rediger**                                                                                                                                                                                                                                        | Every field as you saved it: the two boxes ticked, `Snakke om lønn` in **Annet**, the note in **Notater** |
| 8   | Change the age to `25–29 år` and click **Lagre endringene**, then go back to `/profiles`                                                                                                                                                                 | Still one Profil A card, now with "25–29 år"                                                              |
| 9   | Copy the profile id from the edit page's URL. Log out, log in as the second user and open `/profiles`                                                                                                                                                    | Profil A is not in the list                                                                               |
| 10  | As the second user, open `/profiles/<the id>/edit`                                                                                                                                                                                                       | The not-found page, not the mal                                                                           |

Use a mal on `/configure` (log in as the first user again):

| #   | Do this                                                                                                      | You should see                                                                                                                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 11  | Open `/configure?type=interviewer`, go to **Jobbsøker**                                                      | **Ingen mal** and "Profil A (25–29 år · Litt (under 1 år))". **Administrer maler** links to `/profiles`                                                                        |
| 12  | Choose Profil A (and practice areas if offered), finish the wizard, click **Publiser**                       | Agenter with toast **Agent lagret**                                                                                                                                            |
| 13  | Open the agent                                                                                               | **Jobbsøker** is the mal as one line: "aldersgruppe 25–29 år; arbeidserfaring: litt (under 1 år), sommerjobb i butikk; …; vil øve på: …". The same line is in **Systemprompt** |
| 14  | In the browser console, run `JSON.stringify(await (await fetch('/api/agents')).json()).includes('HEMMELIG')` | `false`: the notes are not in any agent                                                                                                                                        |
| 15  | Open the agent in the test chat and say you are nervous                                                      | The interviewer keeps a calm tempo and is encouraging (judged by hand, depends on the model)                                                                                   |
| 16  | Start a new interviewer, on **Jobbsøker** choose **Ingen mal**, finish and **Publiser**                      | On the agent, **Jobbsøker** is not the Profil A line (practice-only or a short fallback), and notes still never appear                                                         |

Delete and failures:

| #   | Do this                                                                                                       | You should see                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 17  | On `/profiles`, click **Slett** on Profil A, then **Avbryt**                                                  | The dialog closes and the mal is still there                                                       |
| 18  | Click **Slett** again, then **Slett** in the dialog                                                           | The card disappears, and stays gone after a reload                                                 |
| 19  | Open the agent from step 12                                                                                   | Unchanged: the **Jobbsøker** line is still there                                                   |
| 20  | Make a new mal, choose it on the Jobbsøker step, delete it in another tab, then **Publiser** in the first tab | A Norwegian error (or missing-mal behaviour), not a crash or a technical message                   |
| 21  | Stop RAGdoll. Fill in a new mal and save; then reload `/profiles`                                             | A Norwegian error, and the form keeps what you typed; the list shows an error instead of the cards |

If step 13 shows an empty or wrong **Jobbsøker** line, the wizard did not attach the mal: check
that you selected it on the Jobbsøker step before **Publiser**, and that `sources.jobbsoker` is in
the saved agent's `description`.
