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

The product is a *conversational agent configurator*; the job interview is the first scenario, and the architecture should allow other scenarios later.

## Where things live

| What | Where |
|---|---|
| Frontend (this repo) | `IMTEL/team-tdt4290-fall-2026` |
| Backend | [`IMTEL/RAGdoll`](https://github.com/IMTEL/RAGdoll) — our changes go on the branch `TODO` |
| LLMs | IDUN (NTNU HPC), accessed **only through RAGdoll** |
| VR app | The Candidate (contact: Mathias, IMTEL) |
| Backlog & sprint board | [GitHub Project #6](https://github.com/orgs/IMTEL/projects/6) |
| Report | Overleaf <!-- TODO: link --> |
| Customer contact | Slack (product owners: <!-- TODO: idk, Tobias and Ekaterina? -->) |

## Tech stack

We use the stack the customer proposed in the project brief, and reuse existing IMTEL modules instead of building from scratch.

| Layer | Choice |
|---|---|
| Frontend | React / Next.js (TypeScript) |
| Styling | **Modular CSS** — one stylesheet per component (CSS Modules), no global stylesheet except tokens |
| UI | Shared **component library** in `src/components/`: every screen is built from these, nothing styled ad hoc |
| Colours | **Colour palette agreed before coding**, defined once as CSS custom properties and used by name — never a raw hex value in a component |
| Backend | RAGdoll (Python 3, FastAPI, MongoDB, Docker Compose, `uv`, Ruff, pytest) |
| LLMs | IDUN (NTNU), through RAGdoll |
| Auth | RAGdoll's Keycloak | <!-- TODO: Are we using this or another auth? -->
| CI | GitHub Actions: build, lint (ESLint), format check (Prettier) and tests on every pull request |

The palette, the spacing and type scale, and the rules for using the components are in [`docs/design-guide.md`](docs/design-guide.md). Read it before writing UI code.

<!-- TODO: decide and record in docs/decisions/: Next.js or plain React + Vite, which component library (own components vs. a base library) and whether we reuse RAGdollConfig / RAGdollChat (both TypeScript) instead of starting a new frontend. -->

Accessibility is part of the brief: counsellors are non-technical users, and the report has a diversity chapter. Keep contrast, keyboard navigation and readable font sizes in mind from the first component.

## Running locally

<!-- TODO: -->

### Prerequisites



### 1. Backend 



### 2. Frontend (this repo)



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
src/                  application code
tests/                automated tests
```

## Team

| Member | Role Sprint 1 |
|---|---|
| Christian Bjørnaas | Team Leader (whole project) |
| Emma Ruhcheva | Scrum Master |
| Gina Bjøralt Giske | Quality Asurance |
| Sergi Torres Albert | Product Owner |

Supervisor: August Solli Middelkoop. Roles other than Team Leader rotate every sprint.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md): branch naming, commit convention, pull request flow and Definition of Done.

## License

<!-- TODO: ask IMTEL before adding a LICENSE file -->

<!-- IF you have read all of this, hi :D>
