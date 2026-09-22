<!--
Title: same convention as our commits (CONTRIBUTING.md §4), imperative and specific.
  feat(agents): show templates in the agent list
  fix(auth): redirect to login when the token has expired
Types: feat | fix | docs | style | refactor | test | chore
-->

Closes #

## What this does

<!-- One or two sentences anyone in the team can follow, including the customer. Optional screenshots or a short clip for UI changes. -->

## How it works

<!-- Short technical description: main files or components touched, decisions worth knowing about, anything you are unsure about and want the reviewer to look at closely. -->

## How to test it

<!-- Steps the reviewer follows to see it working. If the issue has a "How to demo", it should match. -->

1.
2.

## Checklist

- [ ] Title follows the commit convention
- [ ] Every "resolved when" box in the issue is true — or I say below which ones are not and why
- [ ] `npm run lint`, `npm run format:check` and `npm run test` pass locally
- [ ] Tests added or updated for the new behaviour
- [ ] Documentation updated where the change needs it (README, `docs/`, comments)
- [ ] UI follows `docs/design-guide.md`: shared components, palette tokens, no hard-coded colours or spacing
- [ ] New environment variables are in `.env.example` with a dummy value — no real secrets anywhere
- [ ] No real personal data in code, tests or demo agents

## Anything left over

<!-- Known technical debt or follow-up work. Open an issue and link it here rather than leaving it unsaid. Write "nothing" if there is none. -->
