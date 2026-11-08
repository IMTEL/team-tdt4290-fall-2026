# Extending the app

How to add new things: a new kind of agent, a new interviewer template, a new choice in the
wizard, a new page or route. Each section says which files to touch and what else in the app has
to follow. Read [`architecture.md`](architecture.md) first if you have not; this page assumes you
know the parts.

## Contents

- [The idea: everything type-specific is in one definition](#the-idea-everything-type-specific-is-in-one-definition)
- [Add a new agent type](#add-a-new-agent-type)
- [Add a built-in interviewer template](#add-a-built-in-interviewer-template)
- [Add a choice to the interviewer wizard](#add-a-choice-to-the-interviewer-wizard)
- [Add a field to the interviewer](#add-a-field-to-the-interviewer)
- [Add a built-in stillingsmal, legal template or avatar](#add-a-built-in-stillingsmal-legal-paragraph-or-avatar)
- [Add a new kind of saved template](#add-a-new-kind-of-saved-template)
- [Add a page](#add-a-page)
- [Add an API route that calls RAGdoll](#add-an-api-route-that-calls-ragdoll)
- [Add a shared helper agent, like the observer](#add-a-shared-helper-agent-like-the-observer)
- [Change a prompt](#change-a-prompt)
- [Add an environment variable](#add-an-environment-variable)
- [Before you open the pull request](#before-you-open-the-pull-request)

## The idea: everything type-specific is in one definition

The app was built so that the job interview is the _first_ scenario, not the only one. Everything
that is special about one kind of agent lives in its **agent type definition**
(`AgentTypeDefinition` in [`src/domain/agentTypes/types.ts`](../src/domain/agentTypes/types.ts)):

| Part of the definition       | What it decides                                                               |
| ---------------------------- | ----------------------------------------------------------------------------- |
| `id`, `label`, `description` | The type's id (stored on every agent and template), and how counselors see it |
| `fields`                     | The answers the counselor gives: a key, a label, and whether it is optional   |
| `presets`                    | Which field an intervjuermal, a jobbsøkermal or legal templates fill in       |
| `buildPrompt`                | The agent's system prompt, built from the answers                             |
| `buildSummary`               | The few sentences at the top of the details page                              |
| `explainAnswers`             | «Slik former svarene dine agenten»: which answers change the agent, and how   |
| `buildRoles`                 | The agent's roles in RAGdoll. The Candidate talks to the first one            |
| `defaultName`                | The name suggested when the agent is saved                                    |

The API routes, the mapper to RAGdoll (`src/server/agentMapper.ts`), the storage of answers
(`storedAnswers.ts`) and the edit, clone and details pages read all of this from the definition,
and never name a type or a field. So a new type is one definition plus its form wizard.

The exception is the **form wizard** on `/configure`. The customer wants every agent type set up
the same way as the interviewer: the same six-step form, with the same frame, navigation, drafts,
AI settings and last step, where only the content of the steps differs from type to type. Today that form is
written for the interviewer only, so the first new type has to make it work for more than one
type. How is described in
[step 2 of Add a new agent type](#2-give-it-the-same-form-required). Until a type has a wizard,
`/configure` only says it can't be set up yet.

Agents used to be set up in a configuration chat with a shared configurator agent. The wizard
replaced it ([decision 0005](decisions/0005-form-wizard-instead-of-configuration-chat.md)), and the
chat was removed in #135 ([decision 0006](decisions/0006-remove-configuration-chat.md)).

## Add a new agent type

Example: the planned type **Lærer** (a teacher, for practising an oral exam). It is already listed
as "Kommer snart" in `PLANNED_AGENT_TYPES` in
[`src/domain/agentTypes/registry.ts`](../src/domain/agentTypes/registry.ts).

### 1. Write the definition (required)

1. Create `src/domain/agentTypes/teacher.ts`, exporting an `AgentTypeDefinition`. Use
   [`interviewer.ts`](../src/domain/agentTypes/interviewer.ts) as the model.
   - `id`: short, English, never changed later (it is stored on every agent and template). Use
     the planned id, `teacher`, so the "Kommer snart" card disappears by itself.
   - `fields`: a `key` and a Norwegian `label` for each answer, in the order the details page and
     the edit form should show them. Mark fields the counselor may skip as `optional`.
   - `presets`: leave it out at first. Add `template` if counselors should make templates for
     this type (see step 4).
2. Put the prompt, summary and explanation in their own files in `src/domain/`, as the
   interviewer does (`interviewerPrompt.ts`, `interviewerSummary.ts`, `interviewerAdaptations.ts`),
   each with a test. Keep the guardrails the interviewer prompt has: stay in role, never ask for
   personal data, never ask about or judge protected characteristics.
   - Build `explainAnswers` from the same rules as the prompt, as `interviewerAdaptations.ts`
     does, so the details page never promises something the prompt does not do.
3. In `registry.ts`, import it and add it to `AGENT_TYPES`:
   `const AGENT_TYPES = { interviewer, teacher };`. `listPlannedAgentTypes` drops the planned
   entry once a definition with the same id exists; remove it from `PLANNED_AGENT_TYPES` too.
4. Add the type to `src/domain/agentTypes/registry.test.ts`, and test the prompt, summary and
   explanation.

That alone gives you, with no other change:

- the type in the «Ny agent» dialog on Agenter and on `/configure` without `?type=` (it says the
  type can't be set up yet until step 2 is done);
- saving (`POST /api/agents`), the test chat, rating replies and the observer;
- its own section on Agenter, the details page with summary and answers, editing, cloning and
  deleting;
- the keyword search over its answers.

### 2. Give it the same form (required)

Every type is set up through the same six-step form as the interviewer. The number of steps, the
step bar, **Tilbake**/**Neste**, **Lagre utkast**, the AI settings and the last step stay the same;
what steps 1 to 4 ask for is the type's own.

**What the interviewer's steps hold, and what a teacher's could hold:**

| Step | Interviewer (today)                                                                                                                                                          | Teacher (example)                                             |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 1    | **Stilling og arbeidsplass**: job title, industry, public or private, company; a stillingsmal fills it in (`StillingStep`)                                                   | **Fag og eksamen**: subject, level, curriculum goals          |
| 2    | **Intervjuer**: interviewer template and legal templates (inline in `ConfigureAgent.tsx`)                                                                                    | **Sensor**: a template for who examines, and how strictly     |
| 3    | **Jobbsøker**: job seeker profile and practice areas (`JobSeekerStep`)                                                                                                       | **Elev**: a student profile and what to practise              |
| 4    | **Innstillinger**: interview type, difficulty, number of questions, follow-up, own questions, tillegg (`SettingsStep`)                                                       | **Innstillinger**: exam form, difficulty, number of questions |
| 5    | **AI-innstillinger**: language model, temperature and max tokens, optional (`AiSettingsStep`)                                                                                | The same                                                      |
| 6    | **Fullføre**: overview, «Slik former svarene dine agenten», avatar, name, **Publiser** / **Lagre som privat agent** / **Test agenten** (`FinishActions` in `FinishStep.tsx`) | The same                                                      |

**What stays shared** (write it once, for every type):

- the frame: the step bar, jumping back to a step already reached, **Tilbake**/**Neste** and
  **Lagre utkast** (`WizardFrame` and `WizardNav` in `StillingStep.tsx`), the question-mark help on
  fields (`FieldHelp`), and the bubbles for the chosen templates (`TemplatePeekBubbles`);
- **AI-innstillinger** (`AiSettingsStep`): model, temperature and max tokens are the same for every type;
- the last step, **Fullføre** (`FinishActions`): `definition.explainAnswers`, the avatar, the name
  and the three buttons. Saving goes through `persist()` and `POST /api/agents`, and **Publiser**
  through `PublishToCandidateDialog` and `POST /api/agents/[agentId]/publish`, which already work
  for any type;
- keeping unfinished forms as **Utkast** in `localStorage` (`wizardDraft.ts`, several drafts by
  id), the draft cards on Agenter, and asking before the counselor leaves without saving
  (`LeaveWizardGuard`).

**What each type writes for itself:**

- the step names and the help page's anchor for each (the interviewer's are `FORM_SECTIONS` in
  `src/app/configure/formSections.ts`), and the help text for each step (`NEW_AGENT_STEPS` in
  `src/app/help/helpTopics.ts`). `src/app/help/page.test.tsx` fails if a step has no help part;
- steps 1 to 4: a component per step, and the state the steps fill in;
- a function that turns that state into the type's answers and their sources, like
  `wizardConfiguration()` in `wizardConfiguration.ts` does for the interviewer. Its keys must be
  the keys of the type's `fields`, because the prompt, the summary, the details page and the edit
  form read the answers by those keys;
- the overview lines on the last step (what was chosen in steps 1 to 4; the interviewer's are
  `configurationLines` in `FinishStep.tsx`);
- what the template bubbles show for its templates (the interviewer's are in `templatePeeks.ts`);
- the shape of its draft, so a draft from one type is never opened as another.

Choices that are lists in the steps (like `INTERVIEW_TYPES` in `SettingsStep.tsx`) need a rule in
the type's prompt builder too, the same way as for the interviewer
([Add a choice to the interviewer wizard](#add-a-choice-to-the-interviewer-wizard)).

**The change the first new type has to make** (not done yet). Today `ConfigureAgent.tsx` shows the
interviewer's steps with `if (definition.id === 'interviewer' && wizardStep === …)` branches, and
the last step is rendered by `SettingsStep`, which passes it the interviewer's overview. Do not add a second set of branches for the new type.
Instead:

1. Move the interviewer's steps 1 to 4, their state and `wizardConfiguration()` into one place,
   for example `src/app/configure/wizards/interviewer/`, behind a small interface: the step names,
   the step components, the overview lines and the function that builds the answers.
2. Render **AI-innstillinger** and **Fullføre** (`AiSettingsStep`, `FinishActions`) from the
   shared wizard instead of from the interviewer's branches and `SettingsStep`, taking the
   overview lines from the type's wizard.
3. Let `ConfigureAgent.tsx` pick the wizard from a map keyed by the type's id, and render the
   shared frame and last step around it.
4. Make the draft in `wizardDraft.ts` carry the type's own state, keyed by `agentTypeId` (it
   already stores the id).
5. Add the teacher's wizard to the map.

Keep the wizards under `src/app/`, not in the definition in `src/domain/`: the definition holds no
React, so the server can use it.

Check the interviewer still works the same afterwards: all of `src/app/configure/page.test.tsx`
and the e2e tests should pass without changes to what they expect.

### 3. Decide about The Candidate

The **Publiser** button shows for every agent made in this app (`AgentDetail.tsx`), and The
Candidate puts every published agent in its interviewer list and plays it as the interviewer NPC.
For a type that is not an interview, either hide the button for it in `AgentDetail.tsx`, or agree
with IMTEL (Mathias) how The Candidate should present it. RAGdoll needs no change: publishing is a
flag on any agent.

### 4. Optional: templates for the type

1. Add `presets.template` to the definition: the `field` a template's text fills in, and the
   `TemplateText` wording the template form and picker use.
   `/create-template` then offers the type in its "Type agent" dropdown, the template routes
   accept it, and the pickers on `/configure` and in the edit form show only that type's
   templates.
2. For built-in templates, create `src/data/teacher-templates.ts` (like
   `interviewer-templates.ts`) and add it to `BUILT_IN` in
   [`src/data/templates.ts`](../src/data/templates.ts).
3. **Maler** (`src/app/templates/TemplateLibrary.tsx`) and **Min profil**
   (`src/app/profile/ProfileHome.tsx`) only fetch the counselor's own templates with
   `fetchSavedTemplates('interviewer', …)`. Fetch the new type's too, or the counselor's own
   templates for it will only show on `/configure`.

Job seeker profiles and legal templates can be reused by naming the field they fill in
(`presets.jobSeekerProfile`, `presets.legalTemplates`); the edit form then offers the same choice.
A field filled in by legal templates must be `optional`. Stillingsmaler and bransjemaler are picked
in the interviewer's first step and written into the answers there, so a new type's wizard uses
them the same way if it needs them.

### 5. Places that still name the interviewer

Look at these and decide whether the new type needs the same:

| Where                                                                      | What it does for the interviewer only                                                                                                                                          |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/app/configure/ConfigureAgent.tsx` (`definition.id === 'interviewer'`) | The six-step form wizard. Other types can't be set up until step 2 is done                                                                                                     |
| `src/app/configure/page.tsx`                                               | The wider wizard layout. Use it for every type with a wizard                                                                                                                   |
| `src/app/configure/wizardDraft.ts`, `wizardConfiguration.ts`               | Saving unfinished wizards as **Utkast** in `localStorage` (`configureDraftHref` always links to `?type=interviewer`), and turning the wizard's choices into answers            |
| `src/app/page.tsx`                                                         | **Ny agent** on the start page goes straight to `/configure?type=interviewer&new=1`                                                                                            |
| `src/app/browse-agents/AgentList.tsx` (`sectionsWithNewAgent`)             | «Ny agent» and the draft cards sit in the interviewer section, which shows even when it is empty. Only drafts with `agentTypeId: 'interviewer'` are shown                      |
| `src/app/templates/TemplateLibrary.tsx`, `src/app/profile/ProfileHome.tsx` | Fetch only interviewer templates (see step 4)                                                                                                                                  |
| `src/domain/agentFilters.ts`                                               | The filters on Agenter read the interviewer's answers (`bransje`, `intervjutype`, `vanskelighetsgrad`). Agents of another type drop out as soon as one of those filters is set |
| `src/domain/agentTypes/registry.ts` (`DEFAULT_AGENT_TYPE`)                 | Agents and requests without a type are read as interviewers. Leave this as it is                                                                                               |

The first three rows go away with the change in
[step 2](#2-give-it-the-same-form-required).

### 6. Who may use it

Every counselor may use every type. To limit that, change `listAccessibleAgentTypes` in
`registry.ts`; the type chooser, the template form and the template routes all ask there. Where
such access would be stored (RAGdoll user settings or Keycloak roles) is not decided yet.

### 7. Tests and docs

- A page test, like `src/app/configure/page.test.tsx`, that goes through the new type's six steps
  and checks the answers it saves.
- An e2e test that sets up, saves and opens an agent of the new type through its wizard (see
  [`e2e-testing.md`](e2e-testing.md#writing-a-test)). The mock backend stores agents of any type.
  To create one through the API instead, give `createAgent` in `e2e/support/data.ts` a `type` and
  the new type's answers; today it only makes interviewers.
- Update [Agent types](architecture.md#agent-types) in `architecture.md`, and the
  [user guide](user-guide.md).

## Add a built-in interviewer template

An interviewer template (UI: _intervjuermal_) is a ready-made description of who interviews, such
as «Daglig leder» or «HR-medarbeider». Counselors can make their own on **Maler** without any code
change. To add one that every counselor gets:

1. Add an entry to [`src/data/interviewer-templates.ts`](../src/data/interviewer-templates.ts):
   - `agentType: 'interviewer'`;
   - an `id` that is unique and never changed, because saved agents remember it as the source of
     their `Intervjuer` answer;
   - `title`, a one-line `description` and up to six `focus` tags for the card;
   - `persona`: the text that becomes the `Intervjuer` answer and goes into the prompt, written as
     a counselor would describe the interviewer.
2. Keep within `TEMPLATE_LIMITS` in `src/data/templates.ts`.
3. Nothing else: the wizard, **Maler** and the edit form read the list.

Built-in templates can't be edited or deleted in the app. Changing a built-in template's text
does not change agents already saved with it; their edit form says the template has changed.

## Add a choice to the interviewer wizard

The wizard's choices are lists in the code, and the prompt reacts to the answer text. A new choice
needs both.

| To add                                     | List                                                                        | Prompt rule in `src/domain/interviewerAdaptations.ts`                      |
| ------------------------------------------ | --------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| An interview type (e.g. «Telefonintervju») | `INTERVIEW_TYPES` in `src/app/configure/SettingsStep.tsx`                   | `interviewType`: matches on words in the answer, e.g. `første` and `andre` |
| A level of difficulty                      | `DIFFICULTIES` in `SettingsStep.tsx`                                        | `LEVELS` and `difficulty`                                                  |
| A number of questions                      | `QUESTION_COUNTS` in `SettingsStep.tsx`                                     | `difficulty` (writes the count into the prompt as it is)                   |
| A practice area                            | `PRACTICE_AREAS` and `PRACTICE_CHOICES` in `src/domain/jobSeekerProfile.ts` | `jobSeeker`, one rule per area                                             |

For each:

1. Add the choice to the list. The `id` is the text saved in the answer.
2. Add a rule in `interviewerAdaptations.ts` with both the `instruction` (the line in the prompt)
   and the `effect` (the sentence the counselor sees). Without a rule the choice is saved and
   shown, but the agent behaves as if nothing was chosen.
3. Run `src/domain/interviewerAdaptations.test.ts`. It checks that every instruction ends up in
   the prompt.
4. Update the help text for that step in `src/app/help/helpTopics.ts` if it lists the choices.

Agents saved before the change keep their old answer text and their old prompt until they are
edited.

## Add a field to the interviewer

A new answer, such as «Arbeidstid», touches more places, because the wizard is made by hand:

1. **The label**: add the key to `LABELS` in [`src/domain/configuration.ts`](../src/domain/configuration.ts).
   `Configuration` gets the key from there.
2. **The definition**: add the field to `fields` in `interviewer.ts`, in the order it should be
   shown. Make it `optional` unless every old agent can be given a value: agents saved before the
   field existed come back with it empty, and saving is strict about required fields.
3. **The prompt and the explanation**: use the answer in `interviewerPrompt.ts` through a rule in
   `interviewerAdaptations.ts`, and in `interviewerSummary.ts` if it belongs in the summary.
4. **The wizard**: add the input to the step it belongs to (`StillingStep.tsx`,
   `JobSeekerStep.tsx` or `SettingsStep.tsx`), keep it in `WizardDraft`, and write the answer in
   `wizardConfiguration.ts`. Add it to the overview in `FinishStep.tsx`.
5. **The draft**: if it is part of the wizard's state, add it to `wizardDraft.ts` and accept
   drafts without it, since drafts saved before the change don't have it.
6. **Tests**: `interviewerPrompt.test.ts`, `interviewerAdaptations.test.ts`,
   `wizardConfiguration.test.ts`, `src/app/configure/page.test.tsx`, and the e2e helper
   `e2e/support/configure.ts` if the field is required.

The details page and the edit and clone forms pick the field up from the definition.

## Add a built-in stillingsmal, legal paragraph or avatar

| What                         | Where                                                                                                           | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Stillingsmal (a general job) | [`src/data/job-templates.ts`](../src/data/job-templates.ts)                                                     | Add a `JobTemplate` to `builtInJobTemplates`: a new, stable `id`, the job `title`, the `industry` and `sector`, a line, tasks and a `jobDescription`. A new `industry` name also appears as an industry in the wizard                                                                                                                                                                                                                                                                                                                                                          |
| Legal paragraph              | [`src/data/legal-templates.ts`](../src/data/legal-templates.ts)                                                 | Add a `law(id, jurisdiction, title, description, text, sourceUrl)` to `builtInLegalParagraphs`: a stable `id`, the law and paragraph as `title`, the rule in plain words as `text`, and a link to Lovdata or another official source. The standard template «Rettigheter i ansettelsesprosessen» is built from every paragraph, so it gets the new one too, and counselors can tick it in their own. Have the customer check the wording, and keep within `LEGAL_TEMPLATE_LIMITS` in `src/domain/legalTemplate.ts`. An EU law replaces one of the `legalParagraphPlaceholders` |
| Avatar                       | An image in `public/avatars/`, and an entry in `AVATARS` in [`src/domain/avatars.ts`](../src/domain/avatars.ts) | The `id` is saved on agents; never rename or remove one that is in use (agents with an unknown id show the default image)                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

Counselors can add their own stillingsmaler, bransjemaler, jobbsøkermaler and legal templates in
the app, under **Maler**. Built-in ones are only needed for things every counselor should get.

## Add a new kind of saved template

Stillingsmaler and bransjemaler are stored in RAGdoll's `templates` collection, each with its own
RAGdoll `type`, and share the same route code. To add another kind of template the counselor
saves, copy the stillingsmal:

1. **The domain type**: in `src/domain/`, the template's shape and its limits. See
   `src/domain/workplaceTemplate.ts`.
2. **The mapper**: a `SavedTemplateKind` (from `src/server/savedTemplateRoutes.ts`) with a new
   RAGdoll `type`, and `parse` (checks a request body), `toRagdoll` and `fromRagdoll`. See
   `jobTemplateKind` and `parseNewJobTemplate` in `src/server/workplaceTemplateMapper.ts`.
   `fromRagdoll` must return null for anything of another type, so the routes never touch other
   templates.
3. **The routes**: two files, which only call the shared helpers:

   ```ts
   // src/app/api/<kind>-templates/route.ts
   export const { GET, POST } = savedTemplateListRoutes(myKind);
   // src/app/api/<kind>-templates/[templateId]/route.ts
   export const { GET, PUT, DELETE } = savedTemplateRoutes(myKind);
   ```

4. **The browser side**: fetch and save functions next to `src/components/templates/workplaceApi.ts`,
   a form, and pages under `src/app/templates/` (list card, `new`, details, `edit`). Add the card
   to **Maler** in `TemplateLibrary.tsx` (and `src/domain/templateCatalog.ts`).
5. **Tests**: route tests (copy `src/app/api/job-templates/route.test.ts`), mapper tests, and an
   e2e test. The mock backend already stores templates of any type.

RAGdoll needs no change for a new template type.

## Add a page

1. Create `src/app/<route>/page.tsx` with `metadata` (a Norwegian `title` and `description`). Pages
   are server components; put interactive parts in a `'use client'` component next to it.
2. If it needs a logged-in counselor, add the path to `matcher` in
   [`src/proxy.ts`](../src/proxy.ts).
3. If it belongs in the navbar, add it to `NAV_LINKS` in
   [`src/components/Navbar.tsx`](../src/components/Navbar.tsx). Active highlighting comes for free.
4. Build it from MUI and the shared components, with a `*.module.css` next to it, following the
   [design guide](design-guide.md).
5. Add it to `e2e/accessibility.spec.ts`, so contrast and keyboard checks cover it.
6. Add it to the Pages row in [Inside the frontend](architecture.md#inside-the-frontend).
7. If counselors need to learn how to use it, add a topic to `HELP_TOPICS` in
   [`src/app/help/helpTopics.ts`](../src/app/help/helpTopics.ts) (in Norwegian, with the same
   words as the buttons), and a line to the [user guide](user-guide.md).

## Add an API route that calls RAGdoll

The browser never calls RAGdoll; our route does, as the logged-in user.

1. **Add the call to the adapter**: a function in [`src/server/ragdoll.ts`](../src/server/ragdoll.ts)
   using `requestAsUser(sessionToken, path, init)`. It sets the Bearer token, the 30-second
   timeout, and turns failures into a `RagdollError`. URL-encode every id you put in the path.
   If RAGdoll has no such endpoint, it has to be added on RAGdoll's `tdt4290/main` branch first.
2. **Write the route** in `src/app/api/<path>/route.ts`, in this order:
   1. `const sessionToken = await getSessionToken(req)`, and 401 if there is none;
   2. parse and check the body yourself, and 400 if it is wrong;
   3. call the adapter inside `try`, and return `ragdollErrorResponse(error)` in `catch`;
   4. return only the fields the page needs. Never return keys or tokens.

   `src/app/api/agents/[agentId]/feedback/route.ts` is a short example. If the route sends chat
   messages to a language model, count them with `chatRetryAfter` from `src/server/rateLimit.ts`.

3. **Add the endpoint to the mock backend** in `e2e/support/mock-backend.mjs`, with the same request
   and response shapes. Otherwise the e2e tests get `Mock backend has no <METHOD> <path>`.
4. **Test it**: a `route.test.ts` next to it with `// @vitest-environment node`, mocking
   `@/server/ragdoll` and the session. Cover 401, 400, a RAGdoll failure, and that no key reaches
   the answer.
5. **Call it from the browser** through a small helper (like `src/app/browse-agents/api.ts`) that
   turns the status into a Norwegian message.

## Add a shared helper agent, like the observer

The observer is an agent in RAGdoll that every counselor shares. Its prompt is in this repo, and
our server calls it with an access key from the environment. A new helper works the same way.

1. Write the prompt in `prompts/<name>.nb.md`, following the
   [prompt rules](../CONTRIBUTING.md#prompts).
2. Create the agent in RAGdoll (on the RAGdoll at `RAGDOLL_API_URL`), paste the prompt into its
   **General Agent Prompt**, and make an access key.
3. Add `RAGDOLL_<NAME>_AGENT_ID` and `RAGDOLL_<NAME>_ACCESS_KEY` (see
   [Add an environment variable](#add-an-environment-variable)).
4. In the route, read them, answer with `configErrorResponse()` if they are missing, and call
   `askAgent({ id, accessKey }, messages)`. See `src/app/api/test-chat/observer/route.ts`.
5. Parse the reply strictly in `src/domain/`, and treat it as untrusted: the observer, for
   example, drops every point that does not quote the chat.
6. Add the agent to the mock backend's canned replies and the variables to `playwright.config.ts`.

## Change a prompt

- **The observer**: edit `prompts/observer.nb.md` following the
  [prompt rules](../CONTRIBUTING.md#prompts) (one requirement per bullet; add, don't rewrite; keep
  the fixed formats the parsers read). Then paste the text into the agent in RAGdoll; the repo is
  the source, RAGdoll holds a copy.
- **An agent type's prompt** (such as the interviewer's): edit the code in `src/domain/`, for the
  interviewer `interviewerPrompt.ts` and `interviewerAdaptations.ts`. It is built when an agent is
  saved, so existing agents get the new prompt the next time they are edited, unless their prompt
  was written by hand.

## Add an environment variable

1. Add it to [`.env.example`](../.env.example) with a dummy value and a comment saying what it is
   for and who to ask for the real value.
2. Never prefix a secret with `NEXT_PUBLIC_`: that bundles it into the browser code.
3. Add it to `webServer.env` in `playwright.config.ts`, so the e2e tests never read a real value
   from `.env`.
4. Add it to [Secrets and configuration](architecture.md#secrets-and-configuration), to the
   variables table in the [README](../README.md#3-start-the-frontend-this-repo) if a developer
   must set it, and to [`deployment.md`](deployment.md).
5. Tell the team, since everyone's `.env` needs it.

## Before you open the pull request

- `npm run check` passes, and `npm run test:e2e` if you changed a flow it covers.
- The docs you touched are updated: this page, [`architecture.md`](architecture.md), the
  [user guide](user-guide.md) if counselors see the change, and a
  [decision](decisions/README.md) if it changes how we build.
