# KFI: Konfigurator for intervjuagenter — TDT4290 Group 3 (autumn 2026)

Web application for career counsellors to configure AI interviewer agents, try them out in a chat, and publish them to the VR app **The Candidate**, where job seekers practise job interviews.

Customer: **IMTEL** (Innovative Immersive Technologies for Learning, NTNU) with NAV and Trøndelag fylkeskommune.
Course: TDT4290 Customer Driven Project, NTNU, autumn 2026. Group 3.

<!-- TODO: replace with the final product name once agreed with the customer -->

## Contents

- [What it does](#what-it-does)
- [Where things live](#where-things-live)
- [Tech stack](#tech-stack)
- [Running locally](#running-locally)
  - [Prerequisites](#prerequisites)
  - [1. Start RAGdoll (backend and Keycloak)](#1-start-ragdoll-backend-and-keycloak)
  - [2. Configure Keycloak (first time only)](#2-configure-keycloak-first-time-only)
  - [3. Start the frontend (this repo)](#3-start-the-frontend-this-repo)
  - [4. Test the login](#4-test-the-login)
  - [5. Stop RAGdoll](#5-stop-ragdoll)
  - [Troubleshooting](#troubleshooting)
  - [6. Checks](#6-checks)
- [Deployment](#deployment)
- [Repository layout](#repository-layout)
- [Team](#team)
- [Contributing](#contributing)
- [License](#license)

## What it does

1. A counsellor logs in and sets up an interviewer in a short form wizard (stilling, intervjuer, jobbsøkermal, innstillinger), with optional templates from **Maler**.
2. Progress can be saved as a local **utkast** and finished later from **Agenter**.
3. Publishing builds a system prompt and stores the agent in **RAGdoll**.
4. The counsellor tests the agent in a chat and, when satisfied, can publish it to **The Candidate**.

The product is an _agent configurator_ for career counsellors; the job interview is the first scenario, and the architecture should allow other scenarios later.

## Where things live

| What                   | Where                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------- |
| Frontend (this repo)   | `IMTEL/team-tdt4290-fall-2026`                                                                    |
| Backend                | [`IMTEL/RAGdoll`](https://github.com/IMTEL/RAGdoll) — our changes go on the branch `tdt4290/main` |
| LLMs                   | IDUN (NTNU HPC), accessed **only through RAGdoll**                                                |
| VR app                 | The Candidate (contact: Mathias, IMTEL)                                                           |
| Backlog & sprint board | [GitHub Project #6](https://github.com/orgs/IMTEL/projects/6)                                     |
| Report                 | Overleaf <!-- TODO: link -->                                                                      |
| Customer contact       | Slack (product owners: <!-- TODO: idk, Tobias and Ekaterina? -->)                                 |

## Tech stack

We use the stack the customer proposed in the project brief, and reuse existing IMTEL modules instead of building from scratch.

| Layer         | Choice                                                                                                                                                                                           |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Frontend      | Next.js 16 (App Router, TypeScript, `src/`), React 19, Node.js 24                                                                                                                                |
| UI components | **MUI** (Material UI v9, styled with Emotion) for the building blocks: buttons, text fields, cards, alerts, app bar. MUI's own texts are in Norwegian bokmål (`nbNO` locale)                     |
| Primitives    | A few of our own in `src/components/ui/` (button, dropdown menu), built on headless **Radix** components                                                                                         |
| Styling       | **CSS Modules**: a component's layout and custom styles go in its own `*.module.css`, next to the component. MUI components are themed, not restyled, through `src/lib/mui-theme.ts`             |
| Colours       | **Theme tokens only**: `var(--background)`, `var(--muted-foreground)`, `var(--border)` and friends, defined in `src/app/globals.css` and mirrored into the MUI palette in `src/lib/mui-theme.ts` |
| Icons         | `lucide-react`, and `@mui/icons-material` inside MUI components                                                                                                                                  |
| Dark mode     | `next-themes`, class strategy, light / dark / system. `src/components/ThemeRegistry.tsx` keeps MUI's colour scheme in sync with it                                                               |
| Auth          | NextAuth v4 with the Keycloak provider, against RAGdoll's Keycloak. The Keycloak token is exchanged for a RAGdoll session                                                                        |
| Backend       | RAGdoll (Python 3, FastAPI, MongoDB, Docker Compose, `uv`, Ruff, pytest), called only from our server                                                                                            |
| LLMs          | IDUN (NTNU), through RAGdoll                                                                                                                                                                     |
| Tests         | Vitest, jsdom and Testing Library; Playwright for end-to-end tests ([`docs/e2e-testing.md`](docs/e2e-testing.md))                                                                                |
| CI            | GitHub Actions: lint (ESLint), format check (Prettier), typecheck, tests and build on every pull request; Playwright e2e tests against a mock backend                                            |

The palette, the spacing and type scale, and the rules for using the components are in [`docs/design-guide.md`](docs/design-guide.md). Read it before writing UI code. Why the stack looks like this is recorded in [`docs/decisions/`](docs/decisions/), for example [0002: MUI with CSS Modules](docs/decisions/0002-mui-with-css-modules.md).

Accessibility is part of the brief: counsellors are non-technical users, and the report has a diversity chapter. Keep contrast, keyboard navigation and readable font sizes in mind from the first component.

## Running locally

The app needs three things running on your machine:

| What                    | Where it comes from                                           | URL                     |
| ----------------------- | ------------------------------------------------------------- | ----------------------- |
| Our frontend            | this repo, `npm run dev`                                      | <http://localhost:3000> |
| RAGdoll backend         | the RAGdoll repo, Docker Compose                              | <http://localhost:8000> |
| Keycloak (login)        | the RAGdoll repo, same Docker Compose                         | <http://localhost:8080> |
| MongoDB, LibreTranslate | the RAGdoll repo, same Docker Compose (needed by the backend) | ports 27017 and 5000    |

How logging in works: our **Logg inn** button sends you to RAGdoll's Keycloak. After you sign in there,
our server keeps Keycloak's ID token in an encrypted cookie. RAGdoll checks that token on every
request, so there is no separate RAGdoll login. The browser never talks to RAGdoll: it calls our
own routes under `/api/*` (for example `/api/agents`), which read the token on the server and call
RAGdoll with it. The login code is in `src/lib/auth-options.ts`.

The start page works without RAGdoll running. Logging in, `/configure`, `/test-chat` and
`/browse-agents` need it.

### Prerequisites

- Node.js 24 (the version in [`.nvmrc`](.nvmrc); `nvm use` picks it up) and npm 10 or newer
- [Docker Desktop](https://www.docker.com/products/docker-desktop/), started
- Python 3 (only to generate one key below; macOS has it)
- RAGdoll cloned **next to** this repo, on our branch `tdt4290/main`:

  ```bash
  cd ..   # the folder that contains team-tdt4290-fall-2026
  git clone git@github.com:IMTEL/RAGdoll.git
  cd RAGdoll
  git checkout tdt4290/main
  ```

  IMTEL's `main` lacks routes we add, such as saved templates. On it, the app starts, but those
  features fail.

  ```
  some-folder/
  ├── RAGdoll/
  └── team-tdt4290-fall-2026/
  ```

- Free ports 3000, 5000, 8000, 8080 and 27017. **On macOS, port 5000 is taken by AirPlay
  Receiver**: turn it off in System Settings → General → AirDrop & Handoff (see
  [Troubleshooting](#troubleshooting) for another way).

### 1. Start RAGdoll (backend and Keycloak)

All commands in this step run in the **RAGdoll** folder.

1. Create RAGdoll's `.env` (first time only):

   ```bash
   cd ../RAGdoll
   cp .env.example .env
   ```

2. RAGdoll's `.env.example` is a template for the production server, and two of its placeholders
   stop the backend from starting. Generate real values:

   ```bash
   python3 -c "import base64, os; print(base64.urlsafe_b64encode(os.urandom(32)).decode())"   # FERNET_KEY
   openssl rand -base64 48                                                                    # JWT_SECRET
   ```

   Open `RAGdoll/.env` and paste them in:

   | Variable     | Set it to                           | Why                                                                   |
   | ------------ | ----------------------------------- | --------------------------------------------------------------------- |
   | `FERNET_KEY` | the output of the `python3` command | The placeholder is not a valid key, and the backend crashes on start. |
   | `JWT_SECRET` | the output of the `openssl` command | RAGdoll's Docker Compose refuses to start without it.                 |
   | `ENV`        | leave it as `prod`                  | With `dev`, RAGdoll ignores the database address from Docker Compose. |

   Leave the rest alone. `docker-compose.local.yml` overrides the Keycloak and MongoDB settings with
   local ones.

3. Start everything:

   ```bash
   docker compose -f docker-compose.local.yml up -d
   ```

   The first start takes several minutes: Docker builds the backend image and LibreTranslate
   downloads its language models. Later starts take seconds.

   The backend runs the code in the RAGdoll folder, but does not reload it. After pulling or
   switching branches there, restart it: `docker compose -f docker-compose.local.yml up -d backend`.

4. Check that it is up:

   ```bash
   docker compose -f docker-compose.local.yml ps   # mongodb, keycloak, libretranslate, backend: "healthy"
   curl http://localhost:8000/ping                  # answers 200
   ```

   If `backend` says "Restarting", read its log: `docker logs --tail 30 ragdoll-backend`.

### 2. Configure Keycloak (first time only)

Keycloak needs to know it may send users back to our app after they log out. Without this, **Log
out** ends on a Keycloak page saying "Invalid redirect uri".

Once RAGdoll is running, run this from **this** repo (it needs nothing from `npm install`):

```bash
cd ../team-tdt4290-fall-2026
npm run keycloak:setup
```

It prints `✓ Keycloak is set up` when done. If Keycloak has only just started, wait half a minute
and run it again. The script is [`scripts/keycloak-setup.mjs`](scripts/keycloak-setup.mjs); it
sets **Valid post logout redirect URIs** to `+` on the `ragdoll-config` client. To do the same by
hand, open <http://localhost:8080/admin> (log in as `admin` / `admin`), choose the **ragdoll**
realm, then **Clients** → **ragdoll-config**.

Keycloak keeps this setting in its Docker volume, so it survives restarts. Run the script again
after `docker compose ... down -v`. Running it twice does no harm.

The realm comes with a test user: **`test@example.com`** / **`test`**. You can also register new
users from our login page.

### 3. Start the frontend (this repo)

Back in **this** repo:

```bash
cd ../team-tdt4290-fall-2026
npm install
cp .env.example .env
```

Open `.env`. The values in `.env.example` already match the local RAGdoll, except:

| Variable                                                           | What to do                                                                                                                                                                                                            |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXTAUTH_SECRET`                                                  | Replace with the output of `openssl rand -base64 32`. It encrypts the login cookie.                                                                                                                                   |
| `RAGDOLL_CONFIGURATOR_AGENT_ID`, `RAGDOLL_CONFIGURATOR_ACCESS_KEY` | The shared configurator agent behind `/configure`. It lives on the RAGdoll at `RAGDOLL_API_URL` (the deployed one by default). Ask the team. Not needed to log in.                                                    |
| `RAGDOLL_OBSERVER_AGENT_ID`, `RAGDOLL_OBSERVER_ACCESS_KEY`         | The shared observer agent behind «Be om tilbakemelding» in the test chat, and behind summaries of many thumbs ratings, on the same RAGdoll as the configurator. Ask the team. Its prompt is `prompts/observer.nb.md`. |
| `IDUN_API_KEY`                                                     | The project's IDUN key. Our server puts it into every agent it saves. Needed to save agents; ask the team.                                                                                                            |

For reference, the login settings for local testing are:

```bash
NEXTAUTH_URL=http://localhost:3000
BACKEND_API_URL=http://localhost:8000
KEYCLOAK_CLIENT_ID=ragdoll-config
KEYCLOAK_CLIENT_SECRET=ragdoll-config-secret
KEYCLOAK_ISSUER=http://localhost:8080/realms/ragdoll
```

Then start the app:

```bash
npm run dev
```

The app runs on <http://localhost:3000>. Next.js reads `.env` only when it starts, so restart
`npm run dev` after changing it.

`npm run build` makes a production build and `npm run start` serves it.

### 4. Test the login

It helps to keep RAGdoll's log open in a second terminal (in the RAGdoll folder), so you can see each
call arrive:

```bash
docker compose -f docker-compose.local.yml logs -f backend
```

| #   | Do this                                                                       | You should see                                                                                             |
| --- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 1   | Open <http://localhost:3000/configure> while logged out                       | You are sent to `/login`                                                                                   |
| 2   | Click **Logg inn** and sign in as `test@example.com` / `test`                 | You land back on `/configure`; the navbar shows your name and **Logg ut**                                  |
| 3   | In the browser console (F12), run `await (await fetch('/api/agents')).json()` | `{agents: [...]}` (probably empty), not an error. This shows our route sends the Keycloak token to RAGdoll |
| 4   | Click **Logg ut**                                                             | You pass briefly through Keycloak and end on `/login`                                                      |
| 5   | Run the console command from step 3 again                                     | `{error: 'Not signed in'}`                                                                                 |
| 6   | Click **Logg inn** again                                                      | Keycloak asks for your password again. If it signs you straight in, run `npm run keycloak:setup`           |
| 7   | Click **Logg ut**, then **Opprett konto**                                     | Keycloak's registration form opens                                                                         |

**Optional, token refresh:** the Keycloak ID token that RAGdoll checks lasts as long as the realm's
**Access Token Lifespan** (5 minutes by default, under Realm settings → Tokens in Keycloak's admin
console), and our app renews it at Keycloak automatically. To see that, log in, wait six minutes and
repeat step 3. It should still work.

### 5. Stop RAGdoll

In the RAGdoll folder:

```bash
docker compose -f docker-compose.local.yml down      # stops everything, keeps users, agents and templates
docker compose -f docker-compose.local.yml down -v   # also deletes all data, including the Keycloak setting from step 2
```

### Troubleshooting

| Symptom                                                                                                                       | Cause and fix                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `open .../docker-compose.local.yml: no such file or directory`                                                                | You are in this repo. Run Docker commands in the `RAGdoll` folder.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `ports are not available ... 0.0.0.0:5000 ... address already in use`                                                         | macOS AirPlay Receiver uses port 5000. Turn it off (see Prerequisites), or keep it and move LibreTranslate: create `RAGdoll/docker-compose.port-override.yml` containing `services: { libretranslate: { ports: !override ["5001:5000"] } }` and add `-f docker-compose.port-override.yml` to every `docker compose` command. Do not commit that file.                                                                                                                                                                                              |
| Another `address already in use` (8000, 8080, 27017)                                                                          | Something else uses the port, often another project's container. `docker ps` shows which; stop it.                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `ragdoll-backend` keeps restarting, log ends in `Fernet key must be 32 url-safe base64-encoded bytes`                         | `FERNET_KEY` in `RAGdoll/.env` is still the placeholder. See step 1.2, then `docker compose -f docker-compose.local.yml up -d backend`.                                                                                                                                                                                                                                                                                                                                                                                                            |
| Backend log shows `localhost:27017: Connection refused`                                                                       | `ENV=dev` in `RAGdoll/.env`. Set it back to `prod` and restart the backend.                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Backend log shows `Could not create user indexes: An existing index has the same name`                                        | Harmless warning; the index already exists. Ignore it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| After Keycloak you land on `/login` with "Innloggingen mislyktes"                                                             | Look at the `npm run dev` terminal. `RAGdoll login failed: 401` means RAGdoll rejected the Keycloak token: check `KEYCLOAK_ISSUER` is exactly `http://localhost:8080/realms/ragdoll`. `fetch failed` or `ECONNREFUSED` means the backend is not running. `invalid_client` means `KEYCLOAK_CLIENT_ID` or `KEYCLOAK_CLIENT_SECRET` is wrong.                                                                                                                                                                                                         |
| Keycloak shows `HTTPS required` (or the console shows 403 from `localhost:8080`) when you log in, often while on the NTNU VPN | With the VPN on, Docker can see your requests as coming from a public address, and Keycloak only allows plain HTTP from local ones. Turn off the HTTPS requirement in your local Keycloak (it is kept until `down -v`): `docker exec ragdoll-keycloak sh -c '/opt/keycloak/bin/kcadm.sh config credentials --server http://localhost:8080 --realm master --user admin --password admin && /opt/keycloak/bin/kcadm.sh update realms/ragdoll -s sslRequired=NONE'`. Never do this on a deployed Keycloak. The admin console still needs the VPN off. |
| "Invalid redirect uri" when logging out                                                                                       | Run `npm run keycloak:setup` (step 2).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Logg inn** signs you in without asking for a password after you logged out                                                  | Same as above: run `npm run keycloak:setup`. Without it, the Keycloak session is not ended.                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `NO_SECRET` or `JWT_SESSION_ERROR` in the `npm run dev` terminal                                                              | `NEXTAUTH_SECRET` is missing from `.env`, or you changed it while logged in. Set it, restart `npm run dev` and log in again.                                                                                                                                                                                                                                                                                                                                                                                                                       |

### 6. Checks

Before opening a pull request, run everything CI runs except the build:

```bash
npm run check         # lint + format check + typecheck + tests, stops at the first failure
```

Or one at a time: `npm run lint` (ESLint), `npm run format:check` (Prettier), `npm run typecheck`
(TypeScript), `npm run test` (Vitest). `npm run fix` formats the code and applies ESLint's
automatic fixes.

Never commit `.env`. The IDUN key must not appear anywhere in this repo.

## Deployment

## Repository layout

```
.github/workflows/    CI (lint, format check, typecheck, tests, build on every pull request)
.github/              issue templates and pull request template
docs/design-guide.md  colour palette, component library, CSS rules
docs/decisions/       one page per design decision (ADR)
public/               static assets served at the site root
scripts/              developer scripts, e.g. keycloak-setup.mjs (npm run keycloak:setup)
src/app/              routes (App Router) and API routes (src/app/api/); globals.css holds the tokens and reset
src/components/       our own components, built from MUI and the primitives, with their own *.module.css
src/components/ui/    low-level primitives (button, dropdown menu) built on Radix
src/data/             mock agents, interviewer and industry templates
src/lib/              helpers: api.ts (backend client), login (auth-options.ts, session-tokens.ts), mui-theme.ts, utils.ts (cn)
src/domain/           pure functions: read the KONFIGURASJON block, build the interviewer prompt
src/server/           server-only code: the RAGdoll adapter, agent mapper, error responses
```

Conventions worth knowing before adding code:

- **MUI first.** Reach for an MUI component before writing your own. Change
  how it looks through the theme in `src/lib/mui-theme.ts` so every page
  stays consistent; keep `sx` for one-off layout tweaks.
- **One stylesheet per component.** A component lives next to its
  `*.module.css` and imports it as `styles`. Nothing but tokens and the reset
  belongs in `src/app/globals.css`.
- **Theme tokens only.** Use `var(--background)`, `var(--muted-foreground)`,
  `var(--border)` and friends. A hardcoded `#fff` will look wrong in dark mode.
  For a translucent shade, mix instead of inventing a colour:
  `color-mix(in oklab, var(--accent) 50%, transparent)`.
- **Spacing and radii** come from the tokens too: `var(--radius-md)` for
  controls, `var(--radius-xl)` for cards, `var(--shadow-sm)` for elevation.
- **Borders are opt-in.** The reset gives every element `border: 0 solid
var(--border)`, so `border-width: 1px` is enough to get the themed colour.
- **Dark mode** is a `.dark` class on `<html>`. Components never check it —
  they read tokens, and the tokens change. The one exception is
  `ThemeToggle.module.css`, which uses `:global(.dark)` to cross-fade its icons.
  MUI follows the same class through `ThemeRegistry.tsx`.
- **Navbar links** come from the `NAV_LINKS` array in
  [`src/components/Navbar.tsx`](src/components/Navbar.tsx). Add a route there and
  active highlighting comes for free.

## Team

| Member              | Role Sprint 1               |
| ------------------- | --------------------------- |
| Christian Bjørnaas  | Team Leader (whole project) |
| Emma Ruhcheva       | Scrum Master                |
| Gina Bjøralt Giske  | Quality Asurance            |
| Sergi Torres Albert | Product Owner               |

Supervisor: August Solli Middelkoop. Roles other than Team Leader rotate every sprint.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md): branch naming, commit convention, pull request flow and Definition of Done.

## License

<!-- TODO: ask IMTEL before adding a LICENSE file -->

<!-- IF you have read all of this, hi :D>
