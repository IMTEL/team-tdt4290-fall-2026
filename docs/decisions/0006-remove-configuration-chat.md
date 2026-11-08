# 0006. The configuration chat is removed; every agent type is set up in a wizard

- **Status:** Accepted
- **Date:** 2026-11-06
- **Issues:** #135

## Context

[Decision 0005](0005-form-wizard-instead-of-configuration-chat.md) replaced the configuration chat
with a form wizard for the interviewer, but kept the chat in the code as the fallback for agent
types that have no wizard yet. No such type exists, so no counselor used it.

Keeping it still cost something: a shared configurator agent and its prompt
(`prompts/configurator.nb.md`) to keep in step with RAGdoll, two more secrets
(`RAGDOLL_CONFIGURATOR_AGENT_ID`, `RAGDOLL_CONFIGURATOR_ACCESS_KEY`), the chat route
(`/api/configure/turn`), `ConfigurationChat`, the answer-option buttons, the questions in each agent
type's definition and the parser for the `KONFIGURASJON` block, all with their own tests. The
customer had also said that every agent type should be set up the same way (see 0005), which the
chat did not.

## Options

1. **Keep the chat** as the fallback, as decided in 0005.
2. **Remove the chat**, and give every new agent type a wizard before it can be set up.

## Decision

Option 2. The configurator agent, its prompt, the chat route, `ConfigurationChat`, the answer-option
buttons and the questions in the agent type definitions are removed. A type without a wizard is
shown on `/configure` as not possible to set up yet.

## Consequences

- A new agent type can't be set up until it has a wizard
  ([Add a new agent type](../extending.md#2-give-it-the-same-form-required)).
- The configurator agent in RAGdoll and its two secrets are no longer used by the app.
- Agents saved by the chat earlier still load and are still adapted: the code that reads their
  free-text answers (`src/domain/interviewerAdaptations.ts`) is kept.
- Less to keep in step: the observer is the only shared agent whose prompt lives in `prompts/`.
