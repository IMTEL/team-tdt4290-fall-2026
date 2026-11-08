# 0005. Counselors set up an agent in a form wizard, not in a configuration chat

- **Status:** Accepted. The chat kept as a fallback was removed in
  [0006](0006-remove-configuration-chat.md)
- **Date:** 2026-10-23
- **Issues:** #104 (PR #106)

## Context

From the start (#13, September), a counselor set up an interviewer by chatting with a shared
configurator agent in RAGdoll. The configurator asked the agent type's questions one at a time,
and its last reply ended in a `KONFIGURASJON` block that our server read into answers
([Agent types](../architecture.md#agent-types)). Templates and profiles could be picked before the chat, so it skipped the questions they answered.

During the second sprint demo, the customer stated that they found the UI confusing and the flow hard to follow. Based on this feedback, the team decided to redo the entire UI flow. The first team meeting after the sprint demo, a team member presented some mock ups of a potential new UI. Our team discussed each one, and which we thought would meet the customer's needs.

In October the set-up was changed to a form with fixed steps. The chat had these problems:

- **Unpredictable.** The language model decided the order and the wording of the questions, could
  skip or merge questions, and sometimes ended without a complete `KONFIGURASJON` block. The same
  answers did not always give the same agent.
- **Slow and costly.** Every answer was a round trip to IDUN, counted against the chat rate limit
  and the project's IDUN quota.
- **Hard to see and change.** A counselor could not see all choices at once, or go back and change
  one answer without the conversation changing what came after.
- **Hard to test.** The chat's outcome depends on the language model, so the end-to-end tests
  could not go through it (the mock backend only gives canned replies).

## Options

1. **Keep the chat**, and make the configurator prompt stricter.
2. **A form wizard** with fixed steps, where each choice is a form field, templates fill in
   whole steps, and the answers are built in the browser without a language model.
3. **Both**: the wizard, with the chat as an option for counselors who prefer it.

## Decision

Option 2 for the interviewer. The set-up is a form wizard on `/configure`: Stilling og
arbeidsplass → Intervjuer → Jobbsøker → Innstillinger → AI-innstillinger → Fullføre.
`wizardConfiguration.ts` turns the choices into the same answers the chat produced, and they are
saved with the same `POST /api/agents`, so nothing after `/configure` changed.

The configuration chat is kept in the code as the fallback for agent types that have no wizard
yet, but no counselor sees it today.

Later the customer added that **every agent type** should be set up the same way: the same steps,
frame and last step, with only the content of the steps differing by type. How to get there is in
[`extending.md`](../extending.md#2-give-it-the-same-form-required).

## Consequences

- The same choices always give the same answers and the same prompt. Saving needs no language
  model, so it is fast, costs no IDUN quota and is covered by the end-to-end tests.
- The wizard is written for the interviewer only (`definition.id === 'interviewer'` branches in
  `ConfigureAgent.tsx`). The first new agent type has to move it behind a per-type wizard first.
- Drafts became possible: the wizard's state is plain data, kept in `localStorage`
  (`wizardDraft.ts`).
- A new choice in the wizard needs a list in the code and a rule in the prompt builder
  ([Add a choice to the interviewer wizard](../extending.md#add-a-choice-to-the-interviewer-wizard)).
  The chat could take any free text, the wizard only what is listed (plus the free-text fields).
- The configurator prompt (`prompts/configurator.nb.md`), the chat route and `ConfigurationChat`
  are kept and tested, but only used by a type without a wizard. If the team decides all types get
  a wizard for good, they can be removed (see the TODO in `extending.md`).
