# Contributing

How we work in this repository. Short on purpose: if something here does not match what we do, change the file.

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

| Type | Use |
|---|---|
| `feat` | new functionality |
| `fix` | bug fix |
| `docs` | documentation only |
| `chore` | tooling, CI, dependencies |
| `spike` | throw-away exploration |

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

| Type | When |
|---|---|
| `feat` | a new feature for the user |
| `fix` | a bug fix |
| `docs` | documentation only |
| `style` | formatting, no logic change |
| `refactor` | code change that is neither a fix nor a feature |
| `test` | adding or fixing tests |
| `chore` | build, CI, dependencies, tooling |

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

| Check | Command |
|---|---|
| Build | `npm run build` |
| Lint | `npm run lint` (ESLint) |
| Formatting | `npm run format:check` (Prettier) |
| Tests | `npm run test` |

Run them locally first — a red pipeline blocks your reviewer too. Never merge with CI red, and never disable a check to get a PR through: if a check is wrong, fix the check in its own PR.

### Branch protection on `main`

Configured in *Settings → Branches* (kept here so we can restore it if it is ever lost):

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
- [ ] Documentation touched by the change is updated (README, docs/, code comments)
- [ ] Deployed to the test environment <!-- TODO: depends on IMTEL infrastructure being ready; until then, "runs locally with docker compose" -->
- [ ] Every "resolved when" criterion in the issue is checked by someone other than the author
- [ ] The story can be demoed following its "How to demo" text

Sprint-level (for the sprint review): the increment is demonstrable to the customer and the product backlog sheet (`Sprint`, `Status`, `How to Demo`) is up to date.

## 7. Code style

- **ESLint + Prettier** for the frontend, **Ruff** for anything we write in RAGdoll. Configs live in the repo, so everyone gets the same result; do not override them in your editor.
- Formatting is not a review topic. Prettier decides; run `npm run format` before pushing.
- English everywhere: code, comments, commits, issues.

### UI code

Read [`docs/design-guide.md`](docs/design-guide.md) before writing UI. In short:

- **Modular CSS**: each component has its own `Component.module.css` next to it. No global stylesheet other than the design tokens; no inline styles for anything reusable.
- **Component library**: build screens out of the shared components in `src/components/`. If a screen needs something new, add it to the library instead of styling one page ad hoc.
- **Colour palette**: colours are the agreed tokens (`var(--color-...)`). A raw hex value in a component is a review comment.
- Same for spacing and font sizes: use the scale, not arbitrary pixel values.
- Prefer configuration over hard-coding: questionnaire, templates and scenario definitions live in data files, not in components.

## 8. Secrets and personal data

- Secrets go in `.env` (git-ignored); `.env.example` lists every variable with a dummy value.
- Never put real job seeker data in the repo, in tests or in demo agents. Use invented profiles.
- If a secret is ever committed, tell the team immediately and rotate it — removing the commit is not enough.

## 9. Decisions

Anything that changes how we build (stack, reuse of RAGdollChat, questionnaire driven by LLM or by UI, auth) gets a one-page note in `docs/decisions/NNNN-<slug>.md`: context, options, decision, consequences. Date it and link the issue.
