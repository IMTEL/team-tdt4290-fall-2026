# Testing

<!-- What we test and how much: test levels, tools, what runs in CI, and what we verify by hand before a sprint demo. Feeds chapter 12 of the report. -->

## Contents

- [Tools](#tools)
- [Running](#running)
- [Where tests live](#where-tests-live)
- [What is covered so far](#what-is-covered-so-far)
- [Manual end-to-end check](#manual-end-to-end-check)
- [Manual check: job seeker profiles](#manual-check-job-seeker-profiles)

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
  the typing bubble only while the assistant answers; the newest question's answer options can be
  clicked, older ones are shown as a numbered list, and options are hidden while the assistant
  answers.
- `src/components/chat/AgentChat.test.tsx`: greeting, typing bubble and reply; the whole
  conversation (greeting included) is sent; friendly error, sending blocked, Retry resends the same
  history without repeating the user's message; no technical error text; leaving the page aborts
  the request.
- `src/components/chat/QuestionOptions.test.tsx`: one-answer options are buttons with the agent's
  numbers that answer at once; several-answer options are checkboxes sent in the agent's order
  together with the free-text answer; a free-text answer alone can be sent; nothing is sent before
  something is chosen or written; optional questions get «Hopp over», alone or next to the
  options; everything is disabled while the agent answers.
- `src/domain/questionOptions.test.ts`: the `[ALTERNATIVER: ett|flere]` block is split from the
  text, keeps the agent's numbers, tolerates `1)` and spacing, and a reply without a block or
  without options is plain text; a `[VALGFRITT]` line makes a question skippable and is hidden;
  answers are written as `1. HR, 3. Kollega. Annet: …`.
- `src/components/agents/AnswerList.test.tsx`: each label with its answer, and a dash for an
  empty one.
- `src/components/templates/TemplatePicker.test.tsx`: every template is shown, clicking one
  selects it, "Fortsett uten mal" selects none, "Lag en ny mal" links to `/create-template` (with
  the agent type when given), the type's lead is shown, and
  only saved templates have edit and delete.
- `src/app/configure/page.test.tsx`: the page starts by asking for the agent type, with planned
  types shown as "Kommer snart" and not choosable; choosing the interviewer shows the template
  picker, the steps and a preview of the industry templates grouped by public and private, and
  "Bytt agenttype" goes back and forgets the templates; choosing a template, or continuing without
  one, goes on to the industry picker, and choosing an industry template, or continuing without
  one, opens the chat with the first question not decided (the company with an industry
  template); changing the interviewer template keeps the industry template, and the other way
  round; and the button above the chat goes back to the
  picker; saved templates are shown after the built-in ones, and the built-in ones still show if
  the saved ones cannot be loaded; a deleted template disappears from the picker; the tab title.
- `src/components/templates/IndustryPicker.test.tsx`: every industry template is shown with its
  industry and sector, clicking one selects it, "Fortsett uten bransjemal" selects none, and the
  sector filter shows only public or only private jobs.
- `src/app/configure/ConfigurationChat.test.tsx`: the greeting names the template; with an
  industry template it names that too and asks about the company instead of the job; the agent
  type, the template id and the whole conversation (greeting included) go to the configuration
  turn route; a clicked answer option is sent as a chat message and the conversation goes on; a
  finished configuration shows a short message in the chat instead of the `KONFIGURASJON` block
  and opens the «Stemmer dette?» pop-up with the configuration (Tillegg included) and the save
  form; «Nei, jeg vil endre noe» closes it, «Se oppsummeringen» opens it again, and a new
  configuration opens it again.
- `src/app/configure/SaveAgentForm.test.tsx`: saves under the chosen name and links to testing the
  new agent and to the agents; sends advanced settings only when they were changed; no saving
  without a name or with an empty hand-written prompt; shows the error and lets the user try again.
- `src/components/templates/TemplateForm.test.tsx`: a new template is saved with trimmed fields
  and its agent type, and links back to `/configure`; the agent type dropdown lists the types
  templates can be made for, with planned ones shown but disabled, starts with the type it is
  given, takes its labels from the type, and is locked for a saved template; cannot be saved without the required fields or with too many
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
- `src/app/configure/api.test.ts`: the browser functions send the agent type and only `role` and
  `content` of each message, return
  the configuration when the server says it is done, and turn failures (including an expired
  login) into Norwegian messages; `fetchSavedTemplates` rejects failures and badly shaped
  templates.
- `src/app/api/configure/turn/route.test.ts`: 401 when logged out; 400 for bad bodies; 500 when the
  configurator is not configured, or the agent type is unknown or only planned; sends the briefing
  for the chosen type (an interviewer when none is sent) before the chat, with the text of what
  the interviewer and industry templates decide instead of questions about it; takes the job and
  industry from an industry template, and 400 for an unknown one; reports `done` only for a complete `KONFIGURASJON` block; takes
  the interviewer from a built-in or a saved template, and asks nothing if a saved one cannot be
  loaded; never passes RAGdoll's message on.
- `src/app/api/templates/route.test.ts` and `src/app/api/templates/[templateId]/route.test.ts`:
  lists only readable templates, for the agent type asked for (400 for an unknown or planned
  one) or for every type templates can be made for, saves a valid template with its agent type as
  RAGdoll's type, reads
  and edits one template (404 for one that is missing or not ours), 400 for bad bodies, 401 when
  logged out, deletes with 204 and 404 for an unknown template.
- `src/app/api/user-settings/route.test.ts`: reads and replaces the settings; 400 unless the body
  has a `settings` object; 401 when logged out.
- `src/app/api/agents/route.test.ts`: saves with the counsellor's session token and the IDUN key
  from the environment, as the chosen agent type (an interviewer when none is sent); 401, 400
  (including an unknown or planned type) and 500 cases save nothing; lists the counsellor's agents.
- `src/app/api/agents/[agentId]/route.test.ts`: editing updates the same agent (same id) with the
  new name, answers and prompt, and keeps the fields the edit does not touch; 401 and 400 cases
  (bad JSON, bad name, a missing answer, an agent not made in this app) save nothing; an agent
  the user does not have gives 404 and is never written, so RAGdoll cannot create a new one;
  RAGdoll failures give 502.
- `src/server/ragdoll.test.ts`: `askAgent`, `saveAgent`, `listAgents`, `fetchFullAgent` and
  `updateAgent` against a mocked `fetch`: the session token is sent, 401 and a 422 about the
  token become `unauthorized`, while a 422 listing fields RAGdoll doesn't accept becomes
  `rejected` (502, not "logged out"), an id that is not the user's becomes `not-found`, an update sends the id with
  empty keys, and nothing returns the agents' API keys. The template and settings functions call
  the right paths (settings under our namespace), turn 404 into `not-found`, and keep only the
  fields we use.
- `src/server/templateMapper.test.ts`: a new template is trimmed and validated (including an agent
  type templates can be made for), stored with its agent type as RAGdoll's type and read back;
  other apps' types, planned types and badly shaped content are skipped.
- `src/server/agentMapper.test.ts`: the RAGdoll agent gets the chosen name, the built prompt, the
  stored answers and the IDUN key for both the LLM and the embeddings; `applyEdit` changes the
  name, roles, prompt and answers but keeps the id and every other field. Advanced settings: the
  default model and temperature, the chosen ones, a hand-written prompt that survives an edit of
  the answers, and the built prompt again when the hand-written one is dropped.
- `src/domain/advancedSettings.test.ts`: models outside the list, temperatures outside 0-2 or with
  more than two decimals, and empty or too long prompts are rejected with Norwegian messages;
  badly shaped settings from the browser give null.
- `src/components/agents/AdvancedSettingsFields.test.tsx`: closed by default with a one-line
  summary; shows the built prompt until the counsellor writes one; a decimal comma is accepted;
  errors show in the heading and under the field; reset to the defaults; a message when the
  models could not be loaded.
- `src/app/api/models/route.test.ts`: 401 when logged out; the models RAGdoll offers with the
  default first; falls back to the default when RAGdoll fails (401 included, which can be IDUN
  rejecting the key) or the IDUN key is missing.
- `src/app/api/agents/route.test.ts` and `[agentId]/route.test.ts` also cover advanced settings:
  saved when sent, defaults (new agent) or the agent's own settings (edit) when not, the default
  and the agent's current model are accepted without asking RAGdoll, 502 when another model
  cannot be checked, and 400 for an unknown model, a temperature above 2 or an empty prompt.
- `src/domain/agentTypes/configurator.test.ts`: which fields a template or profile decides, the
  chat's first question, the briefing (questions in order with hints, the type's rules, the block,
  and decided fields left out of both but listed with their text), and reading the `KONFIGURASJON`
  block for any type (complete, missing or empty lines, extra spaces, the optional Tillegg left
  empty when its line is missing, fields fixed by an interviewer or industry template winning). A made-up teacher type shows that a new type needs
  only its definition.
- `src/domain/interviewerPrompt.test.ts`: filling the interviewer prompt from the answers, with
  the Tillegg line only when something was added.
- `src/domain/interviewerSummary.test.ts` and `src/domain/difficulty.test.ts`: the summary in up to
  three sentences; each sentence is left out when its answers are empty; the type and level of
  difficulty (also when the chat added the number of questions); a long job seeker description is
  cut after a whole part; nothing known gives "".
- `src/domain/agentTypes/registry.test.ts`: looking up an agent type, every counsellor having
  every type for now, which types templates can be made for, the planned types (none has a
  definition), checking that every required field has an answer while the optional Tillegg may be
  empty or missing, the interviewer's prompt and role, and for
  every registered type: a label, description and greeting, unique fields with questions, presets
  that name its own fields, the wording for its templates if it has them, and a prompt, roles and name built from a full set of answers.
- `src/domain/agentTypes/storedAnswers.test.ts`: answers are saved with their type and version
  and read back; agents saved before agent types existed are read as interviewers; a field added
  to a type later comes back empty, and answers to removed fields are left out; descriptions we
  did not write give null; the hand-written prompt mark is read back and only written when set.
- `src/app/browse-agents/api.test.ts`: loading the agent list, and saving an edit with `PUT`;
  401, 404, 504, other errors and network failures become Norwegian messages.
- `src/app/browse-agents/[agentId]/AgentDetail.test.tsx`: shows the answers in the old and the
  new storage format, and the agent type (an interviewer for agents saved before types existed,
  none for agents not made here), shows the summary above the answers (and leaves out its empty
  sentences, and the whole summary for an agent we did not make), keeps the advanced settings (model, temperature, the stored
  prompt, a mark for a hand-written one, the default temperature for older agents) closed until
  opened, links to the edit page, and calls `notFound` for an unknown id.
- `src/app/browse-agents/[agentId]/edit/EditAgentForm.test.tsx`: the form is filled in from the
  agent; saving sends the changes and goes back to the agent; unchanged advanced settings are not
  sent; a hand-written prompt starts from the built one and is saved; an invalid temperature blocks
  saving with a Norwegian message; a failed save shows the error and keeps what was typed; saving
  is blocked until something has changed and while a field is empty.

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
differently, `parseAnswers` in `src/domain/agentTypes/configurator.ts` needs to accept that format.
The block only appears when the configurator's **General Agent Prompt** in RAGdoll is the fenced
prompt in `prompts/configurator.nb.md`.

## Manual check: job seeker profiles

Run this after changes to the profiles, the profile choice on `/configure` or the configurator
prompt. The unit tests mock RAGdoll, so only this shows that the profile is stored, that the
configurator stops asking about the job seeker, and that the notes never reach an agent.

Before you start:

- RAGdoll has the profile endpoints with every field. Until
  `feat/profile-experience-and-practice-areas` is merged into `tdt4290/main`, check out that
  branch in RAGdoll and rebuild (`docker compose -f docker-compose.local.yml up --build`).
  On an older RAGdoll, saving fails or the experience and practice areas come back empty.
- The configurator's **General Agent Prompt** in RAGdoll is the current fenced prompt in
  `prompts/configurator.nb.md`. This feature changed it: an old prompt still asks about the job
  seeker.
- You can log in as two users (`test@example.com` / `test`, and one you register yourself).

Create, edit and keep private:

| #   | Do this                                                                                                                                                                                                                                                  | You should see                                                                                            |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1   | Open <http://localhost:3000/profiles> while logged out                                                                                                                                                                                                   | You are sent to `/login`                                                                                  |
| 2   | Log in as the first user and click **Jobbsøkere** in the menu                                                                                                                                                                                            | "Du har ingen profiler ennå …" (or your earlier profiles)                                                 |
| 3   | Click **Lag en ny profil**                                                                                                                                                                                                                               | An empty form; **Lagre profil** is disabled until **Navn på profilen** has text                           |
| 4   | In **Språk**, type 21 languages separated by commas                                                                                                                                                                                                      | "Skriv høyst 20 språk." and **Lagre profil** is disabled. Clear the field again                           |
| 5   | Fill in: name `Profil A`, age `18–24 år`, experience `Litt (under 1 år)`, `sommerjobb i butikk`, `videregående`, `Norsk B1, Arabisk`; tick **Mestre nervøsitet** and **Forklare hull i CV-en**; **Annet** `Snakke om lønn`; **Notater** `HEMMELIG-NOTAT` | "Profilen «Profil A» er lagret." with a link to the profiles                                              |
| 6   | Follow the link                                                                                                                                                                                                                                          | A card for Profil A with "18–24 år · Litt (under 1 år)" and the three practice areas as chips             |
| 7   | Click **Rediger**                                                                                                                                                                                                                                        | Every field as you saved it: the two boxes ticked, `Snakke om lønn` in **Annet**, the note in **Notater** |
| 8   | Change the age to `25–29 år` and click **Lagre endringene**, then go back to `/profiles`                                                                                                                                                                 | Still one Profil A card, now with "25–29 år"                                                              |
| 9   | Copy the profile id from the edit page's URL. Log out, log in as the second user and open `/profiles`                                                                                                                                                    | Profil A is not in the list                                                                               |
| 10  | As the second user, open `/profiles/<the id>/edit`                                                                                                                                                                                                       | The not-found page, not the profile                                                                       |

Use a profile on `/configure` (log in as the first user again):

| #   | Do this                                                                                                      | You should see                                                                                                                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 11  | Open `/configure` and open **Jobbsøkerprofil**                                                               | **Ingen profil** and "Profil A (25–29 år · Litt (under 1 år))". **Administrer profiler** links to `/profiles`                                                                                         |
| 12  | Choose Profil A, then a template                                                                             | Above the chat: "Jobbsøker: Profil A". The greeting says "Du har valgt jobbsøkerprofilen «Profil A»."                                                                                                 |
| 13  | Answer the assistant's questions until it shows the summary, then confirm it                                 | It never asks about the job seeker's age, experience, Norwegian level or what they want to practise. **Lagre agent** appears                                                                          |
| 14  | Save the agent and open it on `/browse-agents`                                                               | **Jobbsøker** is the profile as one line: "aldersgruppe 25–29 år; arbeidserfaring: litt (under 1 år), sommerjobb i butikk; …; vil øve på: mestre nervøsitet, …". The same line is in **Systemprompt** |
| 15  | In the browser console, run `JSON.stringify(await (await fetch('/api/agents')).json()).includes('HEMMELIG')` | `false`: the notes are not in any agent                                                                                                                                                               |
| 16  | Open the agent in the test chat and say you are nervous                                                      | The interviewer keeps a calm tempo and is encouraging (judged by hand, depends on the model)                                                                                                          |
| 17  | Back on `/configure`, click **Bytt mal eller profil**, choose **Ingen profil** and a template                | "Jobbsøker: Ingen profil valgt", no profile sentence in the greeting, and the assistant asks about the job seeker again                                                                               |

Delete and failures:

| #   | Do this                                                                                                       | You should see                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 18  | On `/profiles`, click **Slett** on Profil A, then **Avbryt**                                                  | The dialog closes and the profile is still there                                                   |
| 19  | Click **Slett** again, then **Slett** in the dialog                                                           | The card disappears, and stays gone after a reload                                                 |
| 20  | Open the agent from step 14                                                                                   | Unchanged: the **Jobbsøker** line is still there                                                   |
| 21  | Make a new profile, choose it on `/configure`, delete it in another tab, then send a message in the first tab | A Norwegian error in the chat, not a crash or a technical message                                  |
| 22  | Stop RAGdoll. Fill in a new profile and save; then reload `/profiles`                                         | A Norwegian error, and the form keeps what you typed; the list shows an error instead of the cards |

If step 13 still asks about the job seeker, the configurator in RAGdoll has the old prompt. If
step 14 shows the configurator's own Jobbsøker text instead of the profile line, the server did
not use the profile: check that `/api/configure/turn` was called with `profileId` in the Network
tab.
