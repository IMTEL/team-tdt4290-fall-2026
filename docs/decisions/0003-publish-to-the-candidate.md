# 0003. Publishing is a flag in RAGdoll, read by The Candidate with one shared client key

- **Status:** Accepted
- **Date:** 2026-10-22
- **Issues:** #96, #97

## Context

Counsellors build interviewer agents in our app, and RAGdoll stores them. The Candidate (IMTEL's VR
app) should let job seekers practise with them:

- **#96:** a **Publiser** button makes an agent available to everyone in The Candidate, with a
  name and a short description (US 32).
- **#97:** **Gjem agent** hides it again, and nothing about the job seeker may be readable from The
  Candidate (US 33).

Before this, The Candidate used one hard-coded RAGdoll agent (its "Coordinator"), with that agent's
access key. Nothing in any of the three repos knew "published". The Candidate has no login, so it
can't act as a counsellor. Our agents store the job seeker profile in `description` and the
interviewer persona in the prompt, and both must stay private.

## Options

1. **One access key per published agent.** Publishing creates an access key and gives it to The
   Candidate. RAGdoll can already do this, but The Candidate would need a list of keys from
   somewhere, hiding would mean deleting the right key, and an access key also unlocks
   `/agents/agent-info`, which returns the whole agent, prompt and description included.
2. **A copy of the agent somewhere The Candidate reads.** This adds a second source of truth next
   to RAGdoll, against [decision 0002](0002-stateless-backend-for-frontend.md), and the copy goes
   stale when the agent is edited.
3. **A publish flag in RAGdoll and one shared client key for The Candidate.** RAGdoll gets four
   fields on the agent and three small endpoints. The Candidate holds one key that may only list
   published agents and chat with them.

## Decision

Option 3:

- RAGdoll stores `is_published`, `public_name`, `public_description` and `published_at` on the
  agent. Only `POST /agents/{id}/publish` and `/unpublish` change them, and only the owner may call
  them. Creating or editing an agent never changes them.
- `CANDIDATE_CLIENT_KEY` (RAGdoll's environment) is accepted by `GET /agents/published` and by the
  chat routes, for published agents only. It is deliberately **not** accepted by RAGdoll's general
  access-key check, so it can never read an agent's configuration.
- `GET /agents/published` returns only `agent_id` and the public name and description. No prompt,
  no description, no role names (they are the counsellor's own labels), no keys.
- In chat, RAGdoll picks the agent's first role, because The Candidate never learns role names.
- Our app calls the endpoints through its own route `/api/agents/[agentId]/publish`, as the
  logged-in counsellor. The counsellor never sees or handles a key.
- The Candidate keeps its own Coordinator agent, which decides who talks. The published agent only
  writes what the interviewer NPC says.

## Consequences

- Hiding works at once: the next list leaves the agent out, and the next chat answers 403. No key
  has to be found and deleted.
- We change RAGdoll (on `tdt4290/main`), as we already did for templates and job seeker profiles.
  The change is small and covered by RAGdoll tests (IMTEL/RAGdoll#162).
- **One shared secret.** Anyone who has The Candidate's key can list the published agents and chat
  with them, which costs IDUN usage. That is acceptable because only the public name and
  description are exposed, only published agents can be reached, and the key can be rotated in two
  places (RAGdoll's environment and The Candidate's `.env`).
- The public name and description are the only text that reaches The Candidate. The publish
  dialog therefore warns the counsellor not to write anything about the job seeker there.
- Our name limit went from 100 to 80 characters, to match `public_name`.
- Still open: the NPC's look and voice are random rather than taken from the agent, and The
  Candidate asks the NPC to introduce itself while our prompt assumes the greeting has already
  happened.
