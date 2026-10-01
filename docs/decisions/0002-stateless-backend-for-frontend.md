# 0002. Our server is a stateless backend for the frontend; RAGdoll stores everything

- **Status:** Accepted
- **Date:** 2026-09-30
- **Issues:** #26, #43

## Context

The customer decided on 15.09 that we build no backend of our own: agents are stored in RAGdoll,
and the LLM (IDUN) is only reached through RAGdoll. At the same time the browser cannot talk to
RAGdoll directly:

- Talking to RAGdoll needs secrets: RAGdoll's session token, agents' access keys and the
  project's IDUN key. Anything the browser holds, the user can read.
- RAGdoll returns the decrypted `llm_api_key` to the owner of an agent (`GET /agents/`,
  `GET /fetch-agent`), and every agent we create carries the project's IDUN key.
- Checks we need (is the user logged in, is the configuration valid, later the personal-data
  check) cannot be trusted if they run in the browser.
- RAGdoll's CORS only allows RAGdollConfig and RAGdollChat.

## Decision

The server half of our Next.js app (`src/app/api/*`) is a backend for the frontend (BFF):

- The browser only calls our own routes. Only `src/server/ragdoll.ts` knows RAGdoll's URLs and
  data model.
- The server is stateless: it keeps nothing between requests, neither in a database nor in memory.
  The conversation and the finished configuration live in the browser until the counsellor saves.
- Everything that must persist (users, agents, access keys) is stored in RAGdoll.
- Calls on the counsellor's own agents send their RAGdoll session token, so RAGdoll records them
  as the owner. The shared configurator agent is reached with its access key from the server
  environment.
- Responses to the browser never contain keys, and never RAGdoll's own error text.

We removed the generic proxy `/api/backend/[...path]`, which forwarded any path to RAGdoll and
returned its answer unchanged (#43).

## Consequences

- No database to run or migrate, and no second source of truth next to RAGdoll.
- Our server can be restarted at any time without losing anything.
- A counsellor who reloads the page in the middle of a configuration loses the unsaved
  conversation.
- Each RAGdoll endpoint we use needs a small route of our own; that is where validation and key
  stripping happen.
- Our answers are stored as JSON in the agent's `description` until RAGdoll gets a field for
  them. The Candidate does not read `description`.
