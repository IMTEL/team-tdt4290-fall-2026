# Architecture

<!-- Overview of the system: our frontend, RAGdoll, IDUN and The Candidate. What each part does, how they talk to each other, and where agents and templates are stored. Feeds chapter 8 of the report. -->

This page describes how the system fits together: our frontend, RAGdoll, IDUN and The Candidate.
It separates what is **built** from what is **planned**, so check the status column before you
rely on a part. Why things look the way they do is recorded in [`decisions/`](decisions/).

## Contents

- [Overview](#overview)
- [The parts](#the-parts)
- [Inside the frontend](#inside-the-frontend)
- [Flows](#flows)
  - [Logging in](#logging-in)
  - [Calling RAGdoll as the user](#calling-ragdoll-as-the-user)
  - [Chatting with an agent](#chatting-with-an-agent)
  - [Logging out](#logging-out)
- [Where agents, prompts and templates are stored](#where-agents-prompts-and-templates-are-stored)
- [Secrets and configuration](#secrets-and-configuration)
- [Error handling](#error-handling)
- [Open questions](#open-questions)

## Overview

```mermaid
flowchart LR
    subgraph Browser
        UI[Next.js pages<br/>React + MUI]
    end

    subgraph Frontend["Our Next.js server (this repo)"]
        Proxy["/api/backend/*<br/>proxy with user token"]
        Chat["/api/chat<br/>agent chat"]
        Auth["/api/auth/*<br/>NextAuth"]
        Logout["/api/logout"]
    end

    subgraph RAGdoll["RAGdoll (IMTEL)"]
        API[FastAPI backend]
        KC[Keycloak]
        DB[(MongoDB)]
    end

    IDUN[IDUN LLMs<br/>NTNU HPC]
    TC[The Candidate<br/>VR app]

    UI --> Proxy & Chat & Auth & Logout
    UI -. login redirect .-> KC
    Auth --> KC
    Auth --> API
    Proxy --> API
    Chat --> API
    Logout --> API
    API --> DB
    API --> IDUN
    TC -. planned .-> API
```

Three rules hold the design together:

1. **The browser only talks to our own server** (and to Keycloak's login pages). It never calls
   RAGdoll directly, so no RAGdoll token or access key reaches the browser, and we need no CORS
   setup in RAGdoll.
2. **Only RAGdoll talks to IDUN.** The IDUN key lives in RAGdoll and must never appear in this
   repo.
3. **RAGdoll is the source of truth for agents.** We store no agents of our own; The Candidate
   is meant to read the published agents from RAGdoll too.

## The parts

| Part                 | What it does                                                                                                         | Owned by                  | Status                          |
| -------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------- | ------------------------------- |
| Frontend (this repo) | Web app for counsellors: log in, configure an agent in a chat, test it, browse agents. Next.js server + React pages. | Us                        | Built, in progress              |
| RAGdoll backend      | Stores agents, runs the chat pipeline (prompt + history → LLM), issues session tokens. Python, FastAPI.              | IMTEL (we may contribute) | Running, used as is             |
| Keycloak             | Login and registration. Ships with RAGdoll's Docker Compose (realm `ragdoll`, client `ragdoll-config`).              | IMTEL                     | Running                         |
| MongoDB              | RAGdoll's database: users, agents, documents.                                                                        | IMTEL                     | Running                         |
| IDUN                 | NTNU's HPC cluster that hosts the LLMs. Reached only through RAGdoll.                                                | NTNU                      | Running                         |
| The Candidate        | VR app where job seekers practise interviews with the published agent.                                               | IMTEL                     | Exists; integration not started |

Locally, RAGdoll, Keycloak and MongoDB run in RAGdoll's `docker-compose.local.yml`; see
[Running locally](../README.md#running-locally). The deployed RAGdoll is at
`https://iplvr.it.ntnu.no/backend`.

## Inside the frontend

The frontend is one Next.js 16 app (App Router). Pages are React server components by default;
anything interactive is a client component. Code that holds secrets runs only on the server.

| Layer            | Where                                                                           | What                                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Pages            | `src/app/*/page.tsx`                                                            | `/` start, `/login`, `/configure` (configuration chat), `/test-chat` (interviewer chat), `/browse-agents` (agent list) |
| Route guard      | `src/proxy.ts`                                                                  | Sends signed-out users to `/login` before `/configure` and `/browse-agents`                                            |
| Components       | `src/components/`                                                               | Chat (`chat/`), login buttons (`login/`), agent table (`agents/`), navbar, theme                                       |
| Browser helpers  | `src/lib/api.ts`, `src/lib/auth.ts`                                             | `apiFetch` calls RAGdoll through our proxy; sign-in, register and sign-out helpers                                     |
| Route handlers   | `src/app/api/`                                                                  | `auth/` (NextAuth), `backend/` (proxy), `chat/` (agent chat), `logout/`                                                |
| Server-only code | `src/server/ragdoll.ts`, `src/lib/auth-options.ts`, `src/lib/session-tokens.ts` | RAGdoll chat adapter; NextAuth config and token exchange; reading and refreshing the session token                     |

The chat UI is our own (see [ADR 0001](decisions/0001-own-chat-component.md)). One component,
`AgentChat`, serves both chats; each page passes it a `send` function and a fixed greeting:

```
ConfigurationChat ─┐                         ┌─ useChat (state: messages, waiting, error)
                   ├─ AgentChat(send, greeting) ─┤
TestChat ──────────┘                         └─ MessageList + ChatInput

send = sendToAgent('configurator' | 'interviewer')  →  POST /api/chat
```

`useChat` is a small reducer (idle → waiting → idle or error → retry). It aborts a pending request
when the user leaves the page or clicks **Start på nytt**.

## Flows

### Logging in

We use NextAuth v4 with the Keycloak provider, against RAGdoll's Keycloak. RAGdoll does not accept
Keycloak tokens on its other endpoints, so after login our server trades the Keycloak token for
RAGdoll's own session token.

```mermaid
sequenceDiagram
    actor C as Counsellor
    participant B as Browser
    participant N as Our server (NextAuth)
    participant K as Keycloak
    participant R as RAGdoll

    C->>B: Click "Logg inn"
    B->>K: Redirect to Keycloak login
    C->>K: Username + password
    K->>N: Redirect back with code
    N->>K: Exchange code for tokens
    K-->>N: ID token + access token
    N->>R: POST /api/login {token, provider: keycloak}
    R-->>N: session_token, refresh_token, TTLs, name, picture
    N-->>B: Encrypted session cookie (tokens stay inside)
    B->>C: Back on the page they came from
```

- The tokens live in NextAuth's **encrypted JWT cookie**, encrypted with `NEXTAUTH_SECRET`. The
  browser's `useSession()` only sees the user's name and picture.
- RAGdoll's session token lasts 15 minutes. NextAuth's `jwt` callback refreshes it with
  `POST /api/refresh` when it is about to expire, and ends the session when the refresh token has
  expired too.
- Code: [`src/lib/auth-options.ts`](../src/lib/auth-options.ts).

### Calling RAGdoll as the user

Everything that acts as the signed-in user (listing their agents, later creating and publishing
them) goes through one proxy route, `/api/backend/*`. The browser calls our server as if it were
RAGdoll, and our server adds the user's token before passing the request on. Example: listing the
user's agents.

```mermaid
sequenceDiagram
    participant B as Browser
    participant P as Our server<br/>/api/backend/*
    participant R as RAGdoll

    B->>P: GET /api/backend/agents/<br/>(session cookie sent automatically)
    P->>P: Decrypt cookie, take out RAGdoll session token<br/>(refresh it first if it has expired)
    alt Signed in
        P->>R: GET /agents/<br/>Authorization: Bearer + session token
        R-->>P: 200 [list of agents]
        P-->>B: 200 [list of agents] (passed through unchanged)
    else No valid session
        P-->>B: 401 Not signed in (RAGdoll is never called)
    end
```

In short, the proxy:

1. **Strips the prefix.** `/api/backend/<path>` becomes `BACKEND_API_URL/<path>`. Method, query
   string and body are kept.
2. **Adds the token.** It reads RAGdoll's session token from the encrypted cookie and sends it as
   `Authorization: Bearer ...`. The browser never sees the token.
3. **Passes the answer back.** RAGdoll's status and body go back unchanged. If RAGdoll can't be
   reached, the browser gets `502`.

In the browser, use `apiFetch('/agents/')` from [`src/lib/api.ts`](../src/lib/api.ts). It adds the
`/api/backend` prefix for you. Code:
[`src/app/api/backend/[...path]/route.ts`](../src/app/api/backend/[...path]/route.ts).

A route handler can't update the cookie, so a token refreshed in step 2 is used for that one
request only. NextAuth's regular session polling stores a fresh token in the cookie.

### Chatting with an agent

The two chats talk to two fixed agents in the deployed RAGdoll:

| Agent          | Used on      | Prompt source                                                 |
| -------------- | ------------ | ------------------------------------------------------------- |
| `configurator` | `/configure` | [`prompts/configurator.nb.md`](../prompts/configurator.nb.md) |
| `interviewer`  | `/test-chat` | [`prompts/interviewer.nb.md`](../prompts/interviewer.nb.md)   |

```mermaid
sequenceDiagram
    participant B as Browser (useChat)
    participant N as /api/chat
    participant R as RAGdoll
    participant I as IDUN

    B->>N: POST {agent: "configurator", messages}
    N->>N: Validate, look up agent id + access key in env
    N->>R: POST /api/chat/ask {agent_id, access_key, chat_log}
    R->>I: System prompt + history
    I-->>R: Completion
    R-->>N: {response: {response: "<text>", ...}}
    N-->>B: {response: "<text>"}
```

- The browser sends only an agent **name**. The agent id and access key are server-side env
  variables, so they never reach the browser.
- The whole history is sent on every turn; RAGdoll keeps no conversation state for us.
- The opening greeting is fixed text in the page (no LLM call) but is sent as the first assistant
  turn, so the agent does not greet again.
- These chats use the agent's access key, not the user's session token, and go to
  `RAGDOLL_API_URL` (the deployed RAGdoll), which may differ from `BACKEND_API_URL`. This is a
  stopgap until agents are created per counsellor; see [Open questions](#open-questions).
- Code: [`src/app/api/chat/route.ts`](../src/app/api/chat/route.ts),
  [`src/server/ragdoll.ts`](../src/server/ragdoll.ts).

### Logging out

Clearing our cookie alone would leave the Keycloak session alive, and the next **Logg inn** would
sign the user straight back in. So logout has three steps:

1. The browser calls `POST /api/logout`. Our server revokes the RAGdoll session
   (`GET /api/logout` on RAGdoll) and builds Keycloak's end-session URL.
2. The browser clears the NextAuth cookie (`signOut({ redirect: false })`).
3. The browser goes to Keycloak's end-session URL, which redirects back to `/login`.

Keycloak only redirects back if the client allows it, which `npm run keycloak:setup` configures.
Code: [`src/app/api/logout/route.ts`](../src/app/api/logout/route.ts),
[`src/lib/auth.ts`](../src/lib/auth.ts).

## Where agents, prompts and templates are stored

| What                                      | Stored where today                                                                                             | Target                                                                                        |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Configurator and test interviewer prompts | Source in `prompts/*.nb.md` in this repo; copied by hand into each agent's **General Agent Prompt** in RAGdoll | Same: the repo is the source, RAGdoll holds a copy                                            |
| Counsellors' interviewer agents           | Not yet. `/browse-agents` shows mock data from `src/data/mock-agents.ts`                                       | RAGdoll (MongoDB), created and listed through `/api/backend/agents/`, owned by the counsellor |
| Configuration answers                     | Only in the chat. The configurator ends with a `KONFIGURASJON` block whose fields match the interviewer prompt | Parsed into a system prompt by a prompt builder, saved on the agent in RAGdoll                |
| Templates (role, industry, ...)           | Not yet                                                                                                        | To be decided: in this repo as data, or in RAGdoll                                            |
| Published agents for The Candidate        | Not yet                                                                                                        | Agent marked as published in RAGdoll; The Candidate reads it from there                       |
| Users                                     | Keycloak (login) and RAGdoll (user record, created on first `POST /api/login`)                                 | Same                                                                                          |
| Session                                   | Encrypted NextAuth cookie in the browser                                                                       | Same                                                                                          |

We keep no database of our own. Real job seeker data is never stored: the configurator asks only
for coarse, non-identifying traits (age group, experience, language level).

## Secrets and configuration

All settings are environment variables, listed with dummy values in
[`.env.example`](../.env.example). None has the `NEXT_PUBLIC_` prefix, so none is bundled into the
browser code.

| Variable                                        | Used by                       | Secret? |
| ----------------------------------------------- | ----------------------------- | ------- |
| `BACKEND_API_URL`                               | Login, refresh, proxy, logout | No      |
| `RAGDOLL_API_URL`                               | `/api/chat`                   | No      |
| `RAGDOLL_{CONFIGURATOR,INTERVIEWER}_AGENT_ID`   | `/api/chat`                   | No      |
| `RAGDOLL_{CONFIGURATOR,INTERVIEWER}_ACCESS_KEY` | `/api/chat`                   | Yes     |
| `NEXTAUTH_URL`                                  | NextAuth                      | No      |
| `NEXTAUTH_SECRET`                               | NextAuth (cookie encryption)  | Yes     |
| `KEYCLOAK_CLIENT_ID`, `KEYCLOAK_ISSUER`         | NextAuth Keycloak provider    | No      |
| `KEYCLOAK_CLIENT_SECRET`                        | NextAuth Keycloak provider    | Yes     |

The IDUN key belongs to RAGdoll and is not in this list on purpose. Threats and countermeasures
are in [`security.md`](security.md); how the app is deployed is in
[`deployment.md`](deployment.md).

## Error handling

Errors are translated at each boundary, so technical details stay in the server log and users see
short Norwegian messages:

| Boundary             | What happens                                                                                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RAGdoll → our server | `src/server/ragdoll.ts` turns failures into a `RagdollError` with a kind: `config`, `timeout` (30 s), `unreachable` or `bad-response`                                     |
| Our server → browser | `/api/chat` maps each kind to a status (500, 504, 502, 502) and a fixed English message; RAGdoll's own text is never forwarded                                            |
| Browser → user       | `sendToAgent` turns the status into a `ChatError` with a Norwegian message (for example "Assistenten brukte for lang tid på å svare"), shown with a **Prøv igjen** button |
| Proxy                | `/api/backend/*` returns `401` without a session and `502` if RAGdoll is unreachable; otherwise it passes RAGdoll's status and body through                               |

## Open questions

- **Agent per counsellor.** Today both chats use one shared configurator agent and one shared test
  interviewer. Creating, updating and publishing each counsellor's own agent through
  `/api/backend` replaces the hard-coded interviewer and the mock agent list.
- **Prompt builder.** Where the `KONFIGURASJON` block becomes a system prompt: in our server, or in
  RAGdoll.
- **Templates.** Where interviewer role and industry templates live, and who maintains them.
- **The Candidate.** How the VR app finds and loads a published agent (contact: Mathias, IMTEL).
- **RAGdoll changes.** Whether we need changes in RAGdoll, and on which branch (see the README).
- **Other scenarios.** The brief asks for an architecture that allows scenarios other than job
  interviews. Today the scenario lives entirely in the prompts and page texts, so a new scenario
  should mostly mean new prompts and a new agent pair.
