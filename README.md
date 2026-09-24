# Interviewer Agent Configurator — TDT4290 Group 3 (autumn 2026)

Web application for career counsellors to configure AI interviewer agents, try them out in a chat, and publish them to the VR app **The Candidate**, where job seekers practise job interviews.

Customer: **IMTEL** (Innovative Immersive Technologies for Learning, NTNU) with NAV and Trøndelag fylkeskommune.
Course: TDT4290 Customer Driven Project, NTNU, autumn 2026. Group 3.

<!-- TODO: replace with the final product name once agreed with the customer -->

## What it does

1. A counsellor logs in and starts a configuration chat.
2. The chat asks a short questionnaire (multiple choice + open questions) and lets the counsellor combine templates (interviewer role, industry, ...).
3. The answers become a system prompt; the agent is stored in **RAGdoll**.
4. The counsellor tests the agent in a chat and, when satisfied, publishes it to **The Candidate**.

The product is a _conversational agent configurator_; the job interview is the first scenario, and the architecture should allow other scenarios later.

## Where things live

| What                   | Where                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| Frontend (this repo)   | `IMTEL/team-tdt4290-fall-2026`                                                            |
| Backend                | [`IMTEL/RAGdoll`](https://github.com/IMTEL/RAGdoll) — our changes go on the branch `TODO` |
| LLMs                   | IDUN (NTNU HPC), accessed **only through RAGdoll**                                        |
| VR app                 | The Candidate (contact: Mathias, IMTEL)                                                   |
| Backlog & sprint board | [GitHub Project #6](https://github.com/orgs/IMTEL/projects/6)                             |
| Report                 | Overleaf <!-- TODO: link -->                                                              |
| Customer contact       | Slack (product owners: <!-- TODO: idk, Tobias and Ekaterina? -->)                         |

## Tech stack

We use the stack the customer proposed in the project brief, and reuse existing IMTEL modules instead of building from scratch.

| Layer     | Choice                                                                                                                                                                                                                                    |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend  | Next.js 15 (App Router, TypeScript, `src/`)                                                                                                                                                                                               |
| Styling   | **Modular CSS** — one `*.module.css` per component, next to the component. No global stylesheet except the tokens and reset in `src/app/globals.css`                                                                                      |
| UI        | Our own **component library** in `src/components/`, with the unstyled primitives in `src/components/ui/` built on headless Radix components                                                                                               |
| Colours   | **Theme tokens only** — `var(--background)`, `var(--muted-foreground)`, `var(--border)` and friends, defined once as oklch custom properties in `src/app/globals.css`. Never a raw hex in a component: that is what makes dark mode work. |
| Icons     | `lucide-react`                                                                                                                                                                                                                            |
| Dark mode | `next-themes`, class strategy, light / dark / system                                                                                                                                                                                      |
| Backend   | RAGdoll (Python 3, FastAPI, MongoDB, Docker Compose, `uv`, Ruff, pytest)                                                                                                                                                                  |
| LLMs      | IDUN (NTNU), through RAGdoll                                                                                                                                                                                                              |
| Auth      | RAGdoll's Keycloak                                                                                                                                                                                                                        | <!-- TODO: Are we using this or another auth? --> |
| CI        | GitHub Actions: build, lint (ESLint), format check (Prettier) and tests on every pull request                                                                                                                                             |

The palette, the spacing and type scale, and the rules for using the components are in [`docs/design-guide.md`](docs/design-guide.md). Read it before writing UI code.

<!-- TODO: decide and record in docs/decisions/: Next.js or plain React + Vite, which component library (own components vs. a base library) and whether we reuse RAGdollConfig / RAGdollChat (both TypeScript) instead of starting a new frontend. -->

Accessibility is part of the brief: counsellors are non-technical users, and the report has a diversity chapter. Keep contrast, keyboard navigation and readable font sizes in mind from the first component.

## Running locally

<!-- TODO: -->

### Prerequisites

- Node.js 24 (the version in [`.nvmrc`](.nvmrc) — `nvm use` picks it up)
- npm 10 or newer

### 1. Frontend (this repo)

```bash
npm install
cp .env.example .env.local   # then fill in the values you need
npm run dev
```

The app runs on <http://localhost:3000>.

`npm run build` makes a production build and `npm run start` serves it.

### 2. Backend

The backend is [RAGdoll](https://github.com/IMTEL/RAGdoll), in its own repository.
Nothing in this repo calls it yet — [`src/lib/api.ts`](src/lib/api.ts) is the single
place where that will happen, and it reads `NEXT_PUBLIC_BACKEND_API_URL`
(default `http://localhost:8000`). The start page works without a backend running.

### 3. Checks

The same commands CI runs, so you can see failures before opening a pull request:

```bash
npm run lint          # ESLint
npm run format:check  # Prettier
npm run test          # tests
```

`npm run format` fixes formatting.

Never commit `.env`. The IDUN key must not appear anywhere in this repo.

## Deployment

## Repository layout

```
.github/workflows/    CI (lint, format check, tests on every pull request)
.github/              issue templates and pull request template
docs/design-guide.md  colour palette, component library, CSS rules
docs/decisions/       one page per design decision (ADR)
public/               static assets served at the site root
src/app/              routes (App Router); globals.css holds the tokens and reset
src/components/       our own components, each with its own *.module.css
src/components/ui/    low-level primitives (button, dropdown menu) built on Radix
src/lib/              framework-free helpers: api.ts (backend client), utils.ts (cn)
```

Conventions worth knowing before adding code:

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
  `theme-toggle.module.css`, which uses `:global(.dark)` to cross-fade its icons.
- **Navbar links** come from the `NAV_LINKS` array in
  [`src/components/navbar.tsx`](src/components/navbar.tsx). Add a route there and
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
