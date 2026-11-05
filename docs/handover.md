# Handover

For **IMTEL**, or whoever takes over the app after the course (TDT4290, autumn 2026). This document gathers what you need to own and run the app in one place: where everything is, which secrets exist and how to change them, what has to stay in step between the repos, and what to do first. The details are in the other docs; this page links to them.

<!-- TODO: fill in who at IMTEL takes over, the handover date, and how to reach the team afterwards. -->

## Contents

- [What you are taking over](#what-you-are-taking-over)
- [Who to ask](#who-to-ask)
- [Secrets](#secrets)
- [Things that must be changed together](#things-that-must-be-changed-together)
- [Keeping it healthy](#keeping-it-healthy)
- [What to do first](#what-to-do-first)
- [Where to read more](#where-to-read-more)

## What you are taking over

| Part                                    | Where                                                                                  | State at handover                                                                                                                |
| --------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| This app (frontend and BFF)             | `IMTEL/team-tdt4290-fall-2026`, branch `main`                                          | Works locally; not deployed ([`deployment.md`](deployment.md))                                                                   |
| Our changes to RAGdoll                  | `IMTEL/RAGdoll`, branch `tdt4290/main`                                                 | Needed by the app; not merged into IMTEL's `main` ([future plans](future-plans.md#merge-our-ragdoll-and-the-candidate-branches)) |
| Our changes to The Candidate            | `IMTEL/The-Candidate`, branch `feat/publish-to-candidate` (#38)                        | Lists only published agents; not merged                                                                                          |
| Shared configurator and observer agents | Agents on the RAGdoll at `RAGDOLL_API_URL`; their prompts in [`prompts/`](../prompts/) | Running on the deployed RAGdoll                                                                                                  |
| CI                                      | GitHub Actions: `.github/workflows/ci.yml` and `playwright.yml`                        | Runs on every pull request and push to `main`. Nothing deploys automatically                                                     |

The app has no database of its own: agents, templates, profiles and settings are all in RAGdoll
([decision 0004](decisions/0004-stateless-backend-for-frontend.md)). Backing up RAGdoll's MongoDB
backs up everything the counselors made. Drafts are the exception: they only live in each
counselor's browser.

## Who to ask

| About                                   | Ask                                                                                    |
| --------------------------------------- | -------------------------------------------------------------------------------------- |
| The Candidate and how it shows agents   | Mathias (IMTEL)                                                                        |
| Deployment and IMTEL's test environment | Tobias and Erik (IMTEL)                                                                |
| What the product should do              | The product owners <!-- TODO: the same names as in the README once agreed -->          |
| Why the code looks the way it does      | [`decisions/`](decisions/README.md) first, then the team ([README](../README.md#team)) |

## Secrets

All secrets are environment variables on the server running the app, listed with dummy values in
[`.env.example`](../.env.example) and explained in
[Secrets and configuration](architecture.md#secrets-and-configuration). None of them is in the
repo, and none reaches the browser. If one is ever committed or leaked, change it; removing the
commit is not enough.

| Secret                                                           | Who issues it                           | How to change it, and what happens                                                                                                                                                                                                                                                    |
| ---------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXTAUTH_SECRET`                                                | You (`openssl rand -base64 32`)         | Set a new value and restart. Everyone is logged out once                                                                                                                                                                                                                              |
| `KEYCLOAK_CLIENT_SECRET`                                         | Keycloak, the app's client in the realm | Regenerate it under the client's **Credentials** in Keycloak, then set it and restart. Logging in fails until both match                                                                                                                                                              |
| `RAGDOLL_CONFIGURATOR_ACCESS_KEY`, `RAGDOLL_OBSERVER_ACCESS_KEY` | RAGdoll, on the shared agents           | Make a new access key for the agent in RAGdoll, then set it and restart. The configuration chat or the observer fails until both match                                                                                                                                                |
| `IDUN_API_KEY`                                                   | IDUN (NTNU)                             | Set the new key and restart. **New** agents get it. Agents saved earlier keep the key they were saved with, because RAGdoll stores a copy on each agent and our edits leave it as it is. If the old key is revoked, those agents stop answering until their key is updated in RAGdoll |
| The Candidate's client key                                       | RAGdoll                                 | Not used by this app. It is set in RAGdoll's and The Candidate's environment ([decision 0003](decisions/0003-publish-to-the-candidate.md))                                                                                                                                            |

<!-- TODO: check with IMTEL how to update the IDUN key on saved agents in RAGdoll (a script or a database update), and write it here. -->

## Things that must be changed together

- **The app and RAGdoll's `tdt4290/main`.** The app needs RAGdoll's saved templates, job seeker
  profiles, publishing, ratings and the temperature fix. On IMTEL's `main` of RAGdoll the app
  starts, but those features fail. Merge the branch, or deploy RAGdoll from it.
- **The prompts in `prompts/` and the shared agents in RAGdoll.** RAGdoll holds a copy. After
  changing a file in `prompts/`, paste it into the agent in RAGdoll; never change it only there
  ([Prompts](../CONTRIBUTING.md#prompts)).
- **Formats the code reads from the language model**: `KONFIGURASJON`, `[ALTERNATIVER: …]`,
  `[VALGFRITT]`, and the observer's `Bra:`, `Bedre:` and `For kort:` lines. Change the prompt and
  the parser together.
- **Keycloak's redirect URIs and `NEXTAUTH_URL`.** When the app's address changes, update the
  client's redirect URIs in Keycloak
  ([checklist](deployment.md#checklist-before-the-first-deploy)).
- **The built-in legal texts** (`src/data/legal-templates.ts`) and the law. The wording has not
  been checked by the customer yet, and laws change.

## Keeping it healthy

- **Before every change**: `npm run check`, and `npm run test:e2e` for anything a user sees
  ([`testing.md`](testing.md), [`e2e-testing.md`](e2e-testing.md)). CI runs both on pull requests.
- **Before a demo or a deploy**: the [manual end-to-end check](testing.md#manual-end-to-end-check)
  against the real RAGdoll, Keycloak and IDUN.
- **Dependencies**: run `npm audit` after changing them, and patch known vulnerabilities in their
  own pull request. The app runs on Node.js 24 and Next.js 16; read the Next.js upgrade guide in
  `node_modules/next/dist/docs/` before upgrading, as its APIs change between versions.
- **Accessibility**: the axe tests in `e2e/accessibility.spec.ts` must stay green. New pages are
  checked by adding them there.
- **Known weaknesses** are listed in [Known gaps](security.md#known-gaps) in `security.md`.
  Read them before deploying more widely.

## What to do first

1. **Merge our RAGdoll and The Candidate branches** into IMTEL's `main`.
2. **Deploy the app** following [`deployment.md`](deployment.md), and fill in its TODOs (URL,
   what triggers a deploy, who has access).
3. **Have the legal texts checked** by the customer or a legal expert, and replace the EU
   placeholders ([future plans](future-plans.md#replace-the-eu-placeholders-with-real-eu-laws)).
4. **Decide the open TODOs in the README**: the product name, the product owners and the licence.
5. **Then the rest of [`future-plans.md`](future-plans.md)**, such as new agent types
   ([`extending.md`](extending.md#add-a-new-agent-type)).

## Where to read more

| To                                  | Read                                                                                                                            |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Run it on your machine              | [README: Running locally](../README.md#running-locally)                                                                         |
| Understand how it fits together     | [`architecture.md`](architecture.md), with [names in the app and in the code](architecture.md#names-in-the-app-and-in-the-code) |
| Add a new agent type or feature     | [`extending.md`](extending.md)                                                                                                  |
| Work in the repo                    | [`CONTRIBUTING.md`](../CONTRIBUTING.md)                                                                                         |
| Know what the counselors see        | [`user-guide.md`](user-guide.md)                                                                                                |
| Test publishing all the way into VR | [`testing-publish-to-the-candidate.md`](testing-publish-to-the-candidate.md)                                                    |
