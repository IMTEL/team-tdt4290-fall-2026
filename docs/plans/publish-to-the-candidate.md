# Plan: Publish agents to The Candidate (issues #96 and #97)

## Step 0

Copy this plan to `docs/plans/publish-to-the-candidate.md` in the frontend repo so Emma can read it later. Then stop and wait for her go-ahead before step 1.

## Context

Counsellors build interviewer agents in our web app, and the agents are stored in RAGdoll. Today The Candidate (Unity VR) cannot see them.

It uses **one hardcoded RAGdoll agent**: `6a997572550ef6deab1c149d` in `Assets/Scripts/Providers/MainRag.asset`. That agent's roles are app machinery:

- `Coordinator` picks which NPC talks, using the `CreateDialogue` tool.
- `Actor` gives the NPC its speech.
- `AD-Summary`.

It authenticates with one per-agent `access-key`. Nothing in any of the three repos knows "published".

Goal:

- **#96:** a **"Publiser"** button on Agent Details opens a dialog for the public name and short description (US 32). After publishing, the agent appears in a list inside The Candidate for every user, with no login. The NPC interviewer then talks using that agent's prompt.
- **#97:** a **"Gjem agent"** button hides the agent from The Candidate again. The job-seeker profile (our answers in `description`, and the prompt) must never be readable from The Candidate's side (US 33).
- **How we work:** Emma writes the code herself, one short step at a time. The order is RAGdoll, then frontend, then The Candidate. Each repo gets its own branch, with no commits until she asks.

## Design (recommended)

**Publishing becomes real state in RAGdoll. The Candidate reads it through one new public-list endpoint and one shared client key.**

- RAGdoll stores `is_published`, `public_name`, `public_description` and `published_at` on the agent.
- The Candidate holds one app-wide **client key** (`CANDIDATE_CLIENT_KEY`, set in RAGdoll's config). That key may:
  - list published agents;
  - chat with **any published** agent.
- Unpublishing takes effect immediately, and no per-agent keys are handed out.
- Our published agent becomes the **Actor** for the interviewer NPC. The Candidate's own Coordinator stays on MainRag.
- The NPC already receives the whole chat log plus a `Context/Direction` system message (`DialogueSystem.cs:93-97`). So our prompt drives what the interviewer says.

### 1. RAGdoll (`C:\Users\emma_\Projects\RAGdoll`, branch off `tdt4290/main`)

- `src/models/agent.py` (~line 105): add these fields:
  - `is_published: bool = False`
  - `public_name: str = ""`
  - `public_description: str = ""`
  - `published_at: str | None = None`
- `src/routes/agents.py`:
  - `/update-agent/` (~204-217): keep the publish fields from the stored agent, the same way it already keeps `access_key`. Otherwise an edit silently unpublishes the agent.
  - `POST /agents/{agent_id}/publish`: body `{public_name, public_description}`, max 80 and 300 chars (our own `MAX_NAME_LENGTH` was lowered from 100 to 80 to match). JWT auth, owner only via `_ensure_agent_owner`. Sets the fields.
  - `POST /agents/{agent_id}/unpublish`: owner only.
  - `GET /published-agents`: the `access-key` header must be the client key. Returns `[{agent_id, name, description, roles}]`, where `name` and `description` are the public ones.
    - `roles` holds the role **names** only. The role description is the interviewer persona, so it is left out.
    - It must **never** return the prompt, the `description` JSON (VR-03: no profile), API keys or access keys.
- **Changed while building:** the client key is checked only in `routes/chat.py` `_get_authorized_agent`, through `src/access_service/candidate_client.py`. It is accepted when it equals `config.CANDIDATE_CLIENT_KEY` **and** `agent.is_published` is true.
  - It is deliberately **not** added to `AccessService.authenticate()`. `/agent-info` also uses `authenticate()`, and it returns the full agent: the prompt, the decrypted API keys and the stored answers. Accepting the client key there would leak the job-seeker profile (#97).
- `src/config.py`: add `CANDIDATE_CLIENT_KEY`. An empty value means the feature is off. Add it to `.env.example`.
- DAO: `get_published_agents()` in:
  - `dao/agent/base.py`;
  - `mongodb_agent_dao.py`, using `find({"is_published": True})`;
  - `tests/mocks/mock_agent_dao.py`.
- Tests, in the `tests/endpoints/test_agent_endpoints.py` style. Cover:
  - publish and unpublish, with a 403 for non-owners;
  - the list hides private agents and secret fields;
  - the client key works for published agents only;
  - editing keeps the published flag.

### 2. Frontend (this repo, new branch from `main`)

- `src/server/ragdoll.ts`:
  - Add `publishAgent(token, id, publicName, publicDescription)` and `unpublishAgent(token, id)`, through the existing `requestAsUser`.
  - Add the publish fields to `FullRagdollAgent` and `toSummary`.
- `src/app/api/agents/[agentId]/publish/route.ts`: `POST` and `DELETE`, with an owner check via `isAgentOwner`. Same pattern as `DELETE` in `src/app/api/agents/[agentId]/route.ts:96-116`.
- Add `isPublished` to the `Agent` type in `src/lib/types.ts` and to `isAgent` in `src/app/browse-agents/api.ts:17-30`.
- `src/app/browse-agents/api.ts`: `publishAgent` and `unpublishAgent` helpers, with Norwegian messages like `saveErrorMessage`.
- UI: a `PublishAgentButton.tsx` in the action row of `AgentDetail.tsx:133-153`, modelled on `DeleteAgentButton.tsx`. Only the owner sees it.
  - Not published: **"Publiser"** opens a dialog with the name (pre-filled with the agent name) and a short description.
  - Published: **"Gjem agent"**, with a confirm step.
  - Add a "Publisert i The Candidate" chip in the meta block (93-108).
  - The dialog warns "Ikke skriv noe om jobbsøkeren her", because the short description is the only free text that reaches VR (US 33).
- `applyEdit` (`agentMapper.ts:57-68`) already spreads the existing agent, so the flags survive edits.
- Vitest tests next to the route and the button.

### 3. The Candidate (`C:\Users\emma_\Projects\The-Candidate`, PR to IMTEL/Mathias)

- `Providers/Services/RAGDollService.cs`: add `GetPublishedAgents()`. It calls `GET /backend/published-agents` and parses the list into `RagAgent{id, name=role}` plus the public name and description.
- Add a second provider asset, `PublishedRag.asset`, with `apiKey: CANDIDATE`. That is an env var name, the same pattern as `RAGDOLL`. Add `CANDIDATE=` to `.env.example`.
- UI: an interviewer picker panel, copied from `Views/JobSelectionManager.cs` / `JobButton.cs`. It stores the choice in `ScenarioSettings`.
- Spawn: in `SpawnManager`, the interviewer NPC's `Agent` uses `PublishedRag` with the chosen `RagAgent`. This needs a small runtime setter on `Agent` (`Providers/Core/Agent.cs`).

## Where to update the report (it is wrong or outdated here)

1. **§7.2.1 p.30** says "The Candidate lists an agent's roles as the interviewers to choose from". This is wrong.
   - The Candidate's roles are Coordinator/Actor/AD-Summary of one hardcoded agent, and there is no picker.
   - Replace it with: "a published agent is chosen from RAGdoll's list of published agents and used as the interviewer NPC's actor".
   - The same stale claim is in `interviewer.ts:126`, `ragdoll.ts:92` and `docs/architecture.md`.
2. **Figure 4**:
   - Change the Candidate edge from "access key: /agent-info-by-accesskey, /api/chat/ask" to "client key: /published-agents, /api/chat/ask".
   - Mark the new RAGdoll endpoints.
3. **Table 16, Modifiability** says "RAGdoll is used as is". That is no longer true: we extend RAGdoll with publish fields and endpoints, as the team already did for templates and profiles. **C1** still holds.
4. **Figure 6**: change "Publish to The Candidate (access key)" to "Publish (flag in RAGdoll)". The counsellor never handles a key.
5. **§7.2.1** says "RAGdoll's agent model has no field for other applications' data". This is now partly false, because the publish fields exist. The answers still live in `description`.
6. **§7.6**: move publishing from "still open" to done, and record the decision as an ADR in `docs/decisions/`.
7. **§9 Security**:
   - New secret: the client key.
   - New risk: anyone with the app can chat with published agents, which costs IDUN usage.
   - Mitigations:
     - only published agents are reachable;
     - unpublishing works instantly;
     - the key can be rotated;
     - the list contains no prompt or profile.
8. **US 34 / VR-04** was "out of scope", but the Candidate picker now partly covers it. Update the backlog and the traceability table.

## Verification

- RAGdoll: `uv run pytest tests/` and `uv run ruff check src tests`.
- Frontend: `npm run check`.
- End to end, locally:
  1. Run RAGdoll (docker compose local) with `CANDIDATE_CLIENT_KEY=test`.
  2. Publish an agent in the web app.
  3. `curl -H "access-key: test" localhost/backend/published-agents` shows it.
  4. `POST /api/chat/ask` with the client key works.
  5. Unpublish ("Gjem agent"). Both calls now fail or leave the agent out.
  6. In the Unity editor, the picker lists the agent and the NPC answers with its persona.
