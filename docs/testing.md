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
calls the real RAGdoll: tests replace `fetch`, the RAGdoll adapter or the login with a mock.

## What is covered so far

Unit and component level only:

- `src/app/page.test.tsx`: smoke test for the start page's heading and introduction.
- `src/app/api/agents/[agentId]/chat/route.test.ts`: chats with the agent using the chat key and role
  fetched as the user; the key never reaches the browser; 401 without a session and 404 for an id
  that is not a MongoDB id, both without calling RAGdoll; 400 for bad bodies (including a
  `system` message); 404 when the agent is someone else's; 504 on timeout and 502 without
  RAGdoll's message.
- `src/components/chat/sendToAgent.test.ts`: posts only `role` and `content` to the agent's chat
  route, passes the abort signal on, turns failures (including 404) into Norwegian `ChatError`
  messages, and rethrows aborts untouched.
- `src/app/test-chat/TestChat.test.tsx` and `page.test.tsx`: the greeting, the conversation goes
  to the agent in `?agent=`, starting over, a new conversation when the agent changes, and a link
  to the agents when the URL names none.
- `src/components/chat/ChatInput.test.tsx`: Enter and the button send the trimmed text and clear
  the box, Shift+Enter adds a new line, blank text and a disabled input never send.
- `src/components/chat/MessageList.test.tsx`: messages in order with a hidden speaker label, and
  the typing bubble only while the assistant answers.
- `src/app/configure/ConfigurationChat.test.tsx`: greeting, typing bubble and reply; the whole
  conversation (greeting included) is sent; friendly error, sending blocked, Retry resends the same
  history without repeating the user's message; no technical error text; leaving the page aborts
  the request.
- `src/components/templates/TemplatePicker.test.tsx`: every template is shown, clicking one
  selects it, "Fortsett uten mal" selects none, "Lag en ny mal" links to `/create-template`, and
  only saved templates have edit and delete.
- `src/app/configure/page.test.tsx`: the page starts with the template picker; choosing a template,
  or continuing without one, opens the chat, and the button above the chat goes back to the
  picker; saved templates are shown after the built-in ones, and the built-in ones still show if
  the saved ones cannot be loaded; a deleted template disappears from the picker; the tab title.
- `src/app/configure/ConfigurationChat.test.tsx`: the greeting names the template; the template id
  and the whole conversation (greeting included) go to the configuration turn route; the save form only appears once the
  configuration is finished.
- `src/app/configure/SaveAgentForm.test.tsx`: saves under the chosen name and links to testing the
  new agent and to the agents;
  no saving without a name; shows the error and lets the user try again.
- `src/components/templates/TemplateForm.test.tsx`: a new template is saved with trimmed fields
  and links back to `/configure`; cannot be saved without the required fields or with too many
  focus areas; shows the error and keeps what was typed; a saved template starts with its values
  and saves the changes.
- `src/components/templates/DeleteTemplateButton.test.tsx`: asks before deleting; cancelling
  deletes nothing; a failed delete shows the error and keeps the dialog open.
- `src/components/templates/api.test.ts`: saving, loading, editing and deleting a template call
  the right routes, a missing template loads as null, and failures become Norwegian messages.
- `src/app/create-template/page.test.tsx`: the page saves the form as a new template; the tab
  title.
- `src/app/templates/[templateId]/edit/EditTemplate.test.tsx`: loads the template into the form
  and saves the changes to the same id; a missing template shows the not-found page; a failed load
  shows the error.
- `src/components/profiles/ProfileForm.test.tsx`: saves every field with preset and own practice
  areas; only the name is required; warns against real names and says notes stay private; a
  saved profile starts with its values; shows the error and keeps what was typed.
- `src/components/profiles/ProfileList.test.tsx`: shows each profile with summary, practice areas
  and edit link; the empty and error states; asks before deleting and removes the profile.
- `src/components/profiles/api.test.ts`: the browser functions call the right profile routes,
  reject badly shaped profiles, load a missing profile as null, and give Norwegian messages.
- `src/app/profiles/page.test.tsx` and `src/app/profiles/[profileId]/edit/EditProfile.test.tsx`:
  the profiles page and its link to a new profile; editing loads the profile and saves to the
  same id; a missing profile shows the not-found page.
- `src/domain/jobSeekerProfile.test.ts`: the Jobbsøker line has every filled-in field, never the
  notes or the label, and leaves out empty fields.
- `src/server/profileMapper.test.ts` and `src/app/api/profiles/**/route.test.ts`: profiles are
  trimmed and validated, stored with RAGdoll's field names and read back; the routes give 400,
  401 and 404 where they should.
- `src/app/configure/api.test.ts`: the browser functions send only `role` and `content`, return
  the configuration when the server says it is done, and turn failures (including an expired
  login) into Norwegian messages; `fetchSavedTemplates` rejects failures and badly shaped
  templates.
- `src/app/api/configure/turn/route.test.ts`: 401 when logged out; 400 for bad bodies; 500 when the
  configurator is not configured; reports `done` only for a complete `KONFIGURASJON` block; takes
  the interviewer from a built-in or a saved template, and asks nothing if a saved one cannot be
  loaded; never passes RAGdoll's message on.
- `src/app/api/templates/route.test.ts` and `src/app/api/templates/[templateId]/route.test.ts`:
  lists only readable interviewer templates, saves a valid template as type `interviewer`, reads
  and edits one template (404 for one that is missing or not ours), 400 for bad bodies, 401 when
  logged out, deletes with 204 and 404 for an unknown template.
- `src/app/api/user-settings/route.test.ts`: reads and replaces the settings; 400 unless the body
  has a `settings` object; 401 when logged out.
- `src/app/api/agents/route.test.ts`: saves with the counsellor's session token and the IDUN key
  from the environment; 401, 400 and 500 cases save nothing; lists the counsellor's agents.
- `src/app/api/agents/[agentId]/route.test.ts`: editing updates the same agent (same id) with the
  new name, answers and prompt, and keeps the fields the edit does not touch; 401 and 400 cases
  (bad JSON, bad name, a missing answer, an agent not made in this app) save nothing; an agent
  the user does not have gives 404 and is never written, so RAGdoll cannot create a new one;
  RAGdoll failures give 502.
- `src/server/ragdoll.test.ts`: `askAgent`, `saveAgent`, `listAgents`, `fetchFullAgent` and
  `updateAgent` against a mocked `fetch`: the session token is sent, 401 and 422 become
  `unauthorized`, an id that is not the user's becomes `not-found`, an update sends the id with
  empty keys, and nothing returns the agents' API keys. The template and settings functions call
  the right paths (settings under our namespace), turn 404 into `not-found`, and keep only the
  fields we use.
- `src/server/templateMapper.test.ts`: a new template is trimmed and validated, stored as type
  `interviewer` and read back; other types and badly shaped content are skipped.
- `src/server/agentMapper.test.ts`: the RAGdoll agent gets the chosen name, the built prompt, the
  stored answers and the IDUN key for both the LLM and the embeddings; `applyEdit` changes the
  name, roles, prompt and answers but keeps the id and every other field.
- `src/domain/configuration.test.ts` and `src/domain/interviewerPrompt.test.ts`: reading the
  `KONFIGURASJON` block (complete, missing or empty lines, extra spaces) and filling the
  interviewer prompt from it.
- `src/domain/agentTypes/registry.test.ts`: looking up an agent type, checking that every field
  has an answer, and the interviewer's prompt and role.
- `src/domain/agentTypes/storedAnswers.test.ts`: answers are saved with their type and version
  and read back; agents saved before agent types existed are read as interviewers; a field added
  to a type later comes back empty, and answers to removed fields are left out; descriptions we
  did not write give null.
- `src/app/browse-agents/api.test.ts`: loading the agent list, and saving an edit with `PUT`;
  401, 404, 504, other errors and network failures become Norwegian messages.
- `src/app/browse-agents/[agentId]/AgentDetail.test.tsx`: shows the answers in the old and the
  new storage format, keeps the system prompt closed until opened, links to the edit page, and
  calls `notFound` for an unknown id.
- `src/app/browse-agents/[agentId]/edit/EditAgentForm.test.tsx`: the form is filled in from the
  agent; saving sends the changes and goes back to the agent; a failed save shows the error and
  keeps what was typed; saving is blocked until something has changed and while a field is empty.

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

## Manual end-to-end check

Run this before a demo, and after changes to login, the chat or saving. It uses the real RAGdoll,
Keycloak and IDUN, so it catches what the mocked tests cannot: a wrong environment variable, a
changed RAGdoll API, or a configurator that writes the `KONFIGURASJON` block differently.

Before you start: RAGdoll runs locally and `.env` is filled in as described in the README
(including `RAGDOLL_CONFIGURATOR_*` and `IDUN_API_KEY`). Restart `npm run dev` after changing
`.env`.

| #   | Do this                                                                                  | You should see                                                                                   |
| --- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 1   | Open <http://localhost:3000/configure> while logged out                                  | You are sent to `/login`                                                                         |
| 2   | Log in as `test@example.com` / `test`                                                    | You land on `/configure` with the assistant's greeting                                           |
| 3   | Answer the assistant's questions until it shows a summary, then confirm it               | Its last reply contains the `KONFIGURASJON` block, and a form with **Lagre agent** appears below |
| 4   | Keep or change the suggested name and click **Lagre agent**                              | "«name» er lagret" with a link to your agents                                                    |
| 5   | In the browser console (F12), run `await (await fetch('/api/agents')).json()`            | The new agent is in the list, with your configuration as JSON in `description`                   |
| 6   | Open the Network tab, repeat steps 3 to 5, and look at every request to `/api/*`         | No response contains `llm_api_key`, `embedding_api_key`, an access key or a token                |
| 7   | Log out, log in as a second user (register one on the login page), and repeat step 5     | The first user's agent is not in this list                                                       |
| 8   | Log in as the first user again, open the agent on `/browse-agents` and click **Rediger** | The form shows the agent's name and answers                                                      |
| 9   | Change the name and one answer, and click **Lagre endringer**                            | Back on the details page with the new values; the system prompt shows the new answer             |
| 10  | Repeat step 5                                                                            | Same number of agents as before, with the same id: the agent was updated, not copied             |
| 11  | Stop RAGdoll, change an answer and save, then start RAGdoll again                        | A Norwegian error, and the form still shows what you typed                                       |

If the form in step 3 never appears, look at the assistant's last reply: every line of the block
must start with the exact label (`Stilling:`, `Bransje:` ...). If the model formats it
differently, `parseConfiguration` in `src/domain/configuration.ts` needs to accept that format.
The block only appears when the configurator's **General Agent Prompt** in RAGdoll is the fenced
prompt in `prompts/configurator.nb.md`.
