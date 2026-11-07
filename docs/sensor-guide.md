# Guide for the sensor

For the **sensor and others assessing the project** (TDT4290 Customer Driven Project, NTNU, autumn
2026, group 3): what the product is, where to find things in the repository, and how to run the app
on your own machine in about five minutes, without accounts, secrets or Docker.

## Contents

- [The product in short](#the-product-in-short)
- [Where to look](#where-to-look)
- [Run it in five minutes (demo mode)](#run-it-in-five-minutes-demo-mode)
- [Things to try](#things-to-try)
- [Run the tests](#run-the-tests)
- [Run it against the real backend](#run-it-against-the-real-backend)

## The product in short

A web app where career counselors (NAV, Trøndelag fylkeskommune) set up AI interviewers, test them
in a chat, and publish them to **The Candidate**, IMTEL's VR app where job seekers practise job
interviews. The customer is IMTEL at NTNU.

- **Frontend (this repository)**: Next.js 16, React 19, TypeScript, MUI.
- **Backend**: IMTEL's existing [RAGdoll](https://github.com/IMTEL/RAGdoll) (Python, FastAPI,
  MongoDB, Keycloak), which stores agents and talks to the language models on NTNU's IDUN cluster.
  At the customer's request we built no backend of our own; our changes to RAGdoll are on its
  `tdt4290/main` branch.

The job interview is the first scenario; the code is built so other kinds of conversation partners
can be added as new _agent types_.

## Where to look

| To see                                                      | Read                                                                                        |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| How the system fits together, with diagrams                 | [`architecture.md`](architecture.md)                                                        |
| Explanation of essential choices                            | [`decisions/`](decisions/README.md)                                                         |
| How the app is used                                         | [`user-guide.md`](user-guide.md)                                                            |
| How to add new things, such as a new agent type             | [`extending.md`](extending.md)                                                              |
| How we test, and what is covered                            | [`testing.md`](testing.md), [`e2e-testing.md`](e2e-testing.md)                              |
| Security and personal data                                  | [`security.md`](security.md)                                                                |
| How we work: branches, commits, reviews, Definition of Done | [`CONTRIBUTING.md`](../CONTRIBUTING.md)                                                     |
| UI rules, colours and accessibility                         | [`design-guide.md`](design-guide.md)                                                        |
| Full local set-up for developers                            | [`README.md`](../README.md#running-locally)                                                 |
| The backlog and sprints                                     | [GitHub Project #6](https://github.com/orgs/IMTEL/projects/6), and the closed pull requests |

In the code, the most telling places are:

- [`src/domain/agentTypes/`](../src/domain/agentTypes/): what an agent type is, and the interviewer.
- [`src/domain/interviewerPrompt.ts`](../src/domain/interviewerPrompt.ts) and
  [`interviewerAdaptations.ts`](../src/domain/interviewerAdaptations.ts): how the counselor's
  answers become the interviewer's instructions.
- [`src/server/ragdoll.ts`](../src/server/ragdoll.ts): the only code that talks to the backend.
- [`prompts/`](../prompts/): the prompts of the shared helper agents.

## Run it in five minutes (demo mode)

Demo mode runs the real app against the **mock backend** our end-to-end tests use
(`e2e/support/mock-backend.mjs`): a stand-in for Keycloak and RAGdoll that keeps everything in
memory. You need only **Node.js 24** and npm. No account, `.env` file, Docker or API key.

1. Get the code and install. The repository is **private**: if you can't open it on GitHub, use
   the code from the delivery (unzip it and run `npm ci` in that folder), or ask the team for
   access.

   ```bash
   git clone https://github.com/IMTEL/team-tdt4290-fall-2026.git
   cd team-tdt4290-fall-2026
   npm ci
   ```

2. In one terminal, start the mock backend (leave it running):

   ```bash
   node e2e/support/mock-backend.mjs
   ```

3. In a second terminal, in the same folder, build and start the app against it.

   macOS / Linux:

   ```bash
   export BACKEND_API_URL=http://localhost:8181 RAGDOLL_API_URL=http://localhost:8181 \
     RAGDOLL_CONFIGURATOR_AGENT_ID=mock-configurator RAGDOLL_CONFIGURATOR_ACCESS_KEY=mock-access-key \
     RAGDOLL_OBSERVER_AGENT_ID=mock-observer RAGDOLL_OBSERVER_ACCESS_KEY=mock-access-key \
     NEXTAUTH_URL=http://localhost:3100 NEXTAUTH_SECRET=demo-only-secret \
     KEYCLOAK_CLIENT_ID=ragdoll-config KEYCLOAK_CLIENT_SECRET=mock-client-secret \
     KEYCLOAK_ISSUER=http://localhost:8181/realms/ragdoll IDUN_API_KEY=mock-idun-key
   npm run build && npx next start -p 3100
   ```

   Windows (PowerShell):

   ```powershell
   $env:BACKEND_API_URL="http://localhost:8181"; $env:RAGDOLL_API_URL="http://localhost:8181"
   $env:RAGDOLL_CONFIGURATOR_AGENT_ID="mock-configurator"; $env:RAGDOLL_CONFIGURATOR_ACCESS_KEY="mock-access-key"
   $env:RAGDOLL_OBSERVER_AGENT_ID="mock-observer"; $env:RAGDOLL_OBSERVER_ACCESS_KEY="mock-access-key"
   $env:NEXTAUTH_URL="http://localhost:3100"; $env:NEXTAUTH_SECRET="demo-only-secret"
   $env:KEYCLOAK_CLIENT_ID="ragdoll-config"; $env:KEYCLOAK_CLIENT_SECRET="mock-client-secret"
   $env:KEYCLOAK_ISSUER="http://localhost:8181/realms/ragdoll"; $env:IDUN_API_KEY="mock-idun-key"
   npm run build; npx next start -p 3100
   ```

   The build takes a minute or two.

4. Open <http://localhost:3100> and click **Logg inn**. You are logged in at once as a new test
   user, «Test Bruker 1».

What is different from the real thing:

- **The AI is not real.** The interviewer answers `Mock-svar: <your last message>`, and the
  observer's feedback is canned. Everything else, the forms, templates, saving, editing, publishing
  and access control, is the real app.
- **Every login is a new, empty user.** After **Logg ut**, logging in again gives you a different
  user without your agents. Data is lost when you stop the mock backend.

Stop both with Ctrl+C.

## Things to try

Following [the user guide](user-guide.md), in about ten minutes:

1. **Ny agent**: go through the six steps of the wizard. Choose a stillingsmal, an intervjuermal
   and a jobbsøkermal, and click the template bubbles beside the steps to see what they hold. On
   **Fullføre**, read «Slik former svarene dine agenten».
2. Click **Test agenten** and chat. Rate a reply with a comment, and click **Be om
   tilbakemelding**. In demo mode both the interviewer's replies and the feedback are canned (see
   above).
3. On **Agenter**, try the search and **Filtrer**, then open the agent: the summary,
   **Konfigurasjon** and **Systemprompt** show how the answers became the interviewer's
   instructions. Your rating is at the end of the system prompt, under «Tilbakemeldinger fra
   veilederen».
4. **Publiser** it, then **Rediger** it: notice it is hidden from The Candidate again until it is
   re-published.
5. Under **Maler**, make your own jobbsøkermal and use it in a new agent.
6. Open **Hjelp** (the question mark in the navbar), and **Les hjelpen for denne delen** from a
   step of the wizard.
7. Switch between light and dark mode (the toggle in the navbar), and try the app with the keyboard
   only.

## Run the tests

```bash
npm run check                 # lint, format check, typecheck and the unit and component tests
npx playwright install chromium
npm run test:e2e              # end-to-end tests in Chromium, against the same mock backend
```

The end-to-end tests also check accessibility (WCAG 2.1 AA with axe) on every page. CI runs all of
this, plus Firefox and WebKit, on every pull request.

## Run it against the real backend

The full set-up, with RAGdoll and Keycloak in Docker and real language models, is in the
[README](../README.md#running-locally). It needs the project's IDUN key and the shared agents'
access keys, which we can't publish; ask the team. Testing the whole path into the VR app is
described in [`testing-publish-to-the-candidate.md`](testing-publish-to-the-candidate.md) and needs
Unity.
