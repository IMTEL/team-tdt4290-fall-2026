# Contributing

The following describes how the team works in this repository.

## 1. Workflow in one picture

```
Issue on Project #6  →  branch  →  commits  →  pull request  →  review (1 teammate)  →  CI green  →  squash merge to main
```

- Every change starts from an **issue**. No issue, no branch.
- `main` is protected. Nobody can push to it directly, and a pull request can only be merged when **at least one teammate has approved it** and **CI is green**. These are branch protection rules on GitHub, not good intentions.
- Small pull requests. If a user story is big, split it into task sub-issues and open one PR per task.

## 2. Issues

Two kinds, both created by hand on the [project board](https://github.com/orgs/IMTEL/projects/6):

- **User story** — one per story in the product backlog. Title = story name. Body:

  ```
  This issue is resolved when:

  - [ ] <verifiable criterion>
  - [ ] <verifiable criterion>

  Depends on: #<issue> (optional)

  User story <n>:
  As a <user>, I want <goal>, so that <reason>.
  ```

- **Task** — a technical sub-issue of a user story (`Sub-issue of #<story>`). Also used for spikes and setup work.

Criteria must be things another person can check ("the agent stays in role for 5 exchanges"), not intentions ("works as intended").

Labels: `user-story`, `task`, `bug`, `docs`, `spike`. Milestone = sprint.

## 3. Branches

Branch from `main`. Name:

```
<type>/<issue-number>-<short-slug>
```

| Type    | Use                       |
| ------- | ------------------------- |
| `feat`  | new functionality         |
| `fix`   | bug fix                   |
| `docs`  | documentation only        |
| `chore` | tooling, CI, dependencies |
| `spike` | throw-away exploration    |

Examples: `feat/12-test-chat`, `fix/7-empty-agent-list`, `chore/2-ci-pipeline`.

Delete the branch after merge.

## 4. Commits — Conventional Commits

We follow [Conventional Commits 1.0](https://www.conventionalcommits.org/). RAGdoll enforces the same rule with `pre-commit`, so our commits stay consistent across both repos.

```
<type>(<scope>): <short summary in imperative, lower case, no period>

<optional body: what and why, not how>

<optional footer: Closes #12>
```

**Types** (only these):

| Type       | When                                            |
| ---------- | ----------------------------------------------- |
| `feat`     | a new feature for the user                      |
| `fix`      | a bug fix                                       |
| `docs`     | documentation only                              |
| `style`    | formatting, no logic change                     |
| `refactor` | code change that is neither a fix nor a feature |
| `test`     | adding or fixing tests                          |
| `chore`    | build, CI, dependencies, tooling                |

**Scope** is optional and names the part touched: `chat`, `auth`, `agents`, `questionnaire`, `templates`, `ci`, `deploy`.

**Breaking change**: add `!` after the type/scope (`feat(api)!: ...`) and a `BREAKING CHANGE:` footer.

Examples:

```
feat(chat): ask questionnaire one question at a time
fix(auth): redirect to login when token has expired
docs: add local setup steps to README
chore(ci): run lint and tests on pull requests
test(agents): cover empty agent list
```

Rules of thumb:

- One logical change per commit. `git add -p` helps.
- Summary ≤ 72 characters, English, imperative ("add", not "added" or "adds").
- Reference the issue in the footer of the last commit or in the PR (`Closes #12`), not in the summary.
- Never commit `.env`, keys, `node_modules` or build output.

Optional: install `pre-commit` and copy RAGdoll's `.pre-commit-config.yaml` so the commit-msg hook rejects non-conforming messages locally.

## 5. Pull requests

- Title follows the same convention as commits (`feat(chat): test chat with a configured agent`). On squash merge it becomes the commit on `main`.
- Fill in the PR template: what, why, how to test, screenshots for UI, `Closes #<issue>`.
- Request a reviewer from the team. We review in pairs and rotate, so over a sprint everyone reads everyone's code.
- Review within one working day. If you cannot, say so in the PR so someone else takes it.
- The author merges once the PR is approved and CI is green. **Squash merge**, then delete the branch.

What a reviewer checks: does it do what the issue says, can I run it, are the "resolved when" boxes really true, are tests there, is anything hard-coded that belongs in config, does the "how to demo" still hold.

### What CI checks

Every pull request runs, and all of them must pass before merging:

| Check      | Command                                                                         |
| ---------- | ------------------------------------------------------------------------------- |
| Lint       | `npm run lint` (ESLint)                                                         |
| Formatting | `npm run format:check` (Prettier)                                               |
| Types      | `npm run typecheck` (TypeScript)                                                |
| Tests      | `npm run test` (Vitest)                                                         |
| Build      | `npm run build`                                                                 |
| End-to-end | Playwright in Chromium, Firefox and WebKit (`.github/workflows/playwright.yml`) |

Run them locally first with `npm run check` (everything except the build and the end-to-end tests; run `npm run test:e2e` for those, see [`docs/e2e-testing.md`](docs/e2e-testing.md)) — a red pipeline blocks your reviewer too. Never merge with CI red, and never disable a check to get a PR through: if a check is wrong, fix the check in its own PR.

### Branch protection on `main`

Configured in _Settings → Branches_ (kept here so we can restore it if it is ever lost):

- Require a pull request before merging — **1 approval**
- Dismiss stale approvals when new commits are pushed
- Require status checks to pass: build, lint, format, test
- Require branches to be up to date before merging
- Block force pushes and branch deletion
- Rules apply to administrators too

## 6. Definition of Done

A user story is **done** when every box holds. Tasks use the first four.

- [ ] Code is on `main` through a reviewed pull request
- [ ] CI is green (build, lint, tests)
- [ ] Automated tests cover the new behaviour where it is reasonable to test <!-- TODO: agree the test scope (unit / integration / e2e) -->
- [ ] No known technical debt hidden — if something is left, it is written as an issue
- [ ] Documentation touched by the change is updated (README, docs/, code comments). A change counselors see updates [`docs/user-guide.md`](docs/user-guide.md); a new way to extend the app updates [`docs/extending.md`](docs/extending.md)
- [ ] Deployed to the test environment <!-- TODO: depends on IMTEL infrastructure being ready; until then, "runs locally with docker compose" -->
- [ ] Every "resolved when" criterion in the issue is checked by someone other than the author
- [ ] The story can be demoed following its "How to demo" text

Sprint-level (for the sprint review): the increment is demonstrable to the customer and the product backlog sheet (`Sprint`, `Status`, `How to Demo`) is up to date.

## 7. Code style

- **ESLint + Prettier** for the frontend, **Ruff** for anything we write in RAGdoll. Configs live in the repo, so everyone gets the same result; do not override them in your editor.
- Formatting is not a review topic. Prettier decides; run `npm run fix` (Prettier + ESLint's automatic fixes) before pushing.
- Line endings are LF on every OS (`.gitattributes`), so Prettier gives the same result on Windows as in CI.
- English everywhere: code, comments, commits, issues.

### UI code

Read [`docs/design-guide.md`](docs/design-guide.md) before writing UI. In short:

- **MUI**: use MUI components (and MUI X Data Grid for tables) for standard controls. Change their look through the theme in `src/lib/mui-theme.ts`, not per page. See [decision 0002](docs/decisions/0002-mui-with-css-modules.md).
- **Modular CSS**: each component has its own `Component.module.css` next to it. No global stylesheet other than the design tokens; no inline styles for anything reusable.
- **Component library**: build screens out of the shared components in `src/components/` (listed in [Shared components](docs/design-guide.md#shared-components)). If a screen needs something new, add it to the library instead of styling one page ad hoc.
- **Colour palette**: colours are the agreed tokens in `src/app/globals.css` (`var(--primary)`, `var(--muted-foreground)`, …). A raw hex value in a component is a review comment.
- Same for spacing: use the scale (`var(--space-1)` … `var(--space-6)`), not arbitrary pixel values. For font sizes, see [Tokens](docs/design-guide.md#tokens).
- Prefer configuration over hard-coding: agent types are defined in `src/domain/agentTypes/` and built-in templates live in `src/data/`, not in components. How to add to them: [`docs/extending.md`](docs/extending.md).

### Prompts

There are two kinds of prompt, kept in different places:

- **The shared observer agent's prompt** is `prompts/observer.nb.md` (the test chat's «Be om tilbakemelding», and the summary of many ratings). The file explains the agent and its settings; the prompt itself is the ` ```text ` block.
- **The prompts of the agents counselors make** are built in code when the agent is saved, from the agent type's definition. For the interviewer that is `src/domain/interviewerPrompt.ts` and `src/domain/interviewerAdaptations.ts`. See [Change a prompt](docs/extending.md#change-a-prompt).

The prompt text itself is in Norwegian (bokmål), because that is what the agents answer in. These rules apply to people and to AI coding assistants alike:

- **One requirement per bullet.** Requirements are written as bullets under the section they belong to, so they can be added one by one. Examples and short framing text may sit between them.
- **Add, don't rewrite.** A new requirement is a new bullet in the section it belongs to. Do not reword, merge or delete existing bullets unless the change is meant to replace that requirement, and say so in the commit message.
- **Keep the fixed formats exact.** Text the code writes or reads must match it: the observer's `Bra:`, `Bedre:` and `For kort:` lines (`parseObserverReply` in `src/domain/observerFeedback.ts`), and `SAMMENDRAG AV VURDERINGER:` and the heading `## Tilbakemeldinger fra veilederen` for ratings (`src/domain/interviewerFeedbackPrompt.ts`). Change the prompt and the code in the same commit.
- **RAGdoll holds a copy.** After changing a file in `prompts/`, paste the text inside its ` ```text ` block into the agent's **General Agent Prompt** in the RAGdoll at `RAGDOLL_API_URL`, and check the settings the file lists (such as temperature and `llm_max_tokens`). The repo is the source; never change the prompt only in RAGdoll.

## 8. Secrets and personal data

- Secrets go in `.env` (git-ignored); `.env.example` lists every variable with a dummy value.
- Never put real job seeker data in the repo, in tests or in demo agents. Use invented profiles.
- If a secret is ever committed, tell the team immediately and rotate it — removing the commit is not enough.

## 9. Decisions

Anything that changes how we build (stack, reuse of RAGdollChat, questionnaire driven by LLM or by UI, auth) gets a one-page note in `docs/decisions/NNNN-<slug>.md`: context, options, decision, consequences. Date it, link the issue, and add it to the list in [`docs/decisions/README.md`](docs/decisions/README.md).
