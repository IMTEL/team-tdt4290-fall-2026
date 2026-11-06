# Future plans

What we would do next, if the project continued. Each item says why it matters, where it starts in
the code, and what it needs from outside the team. For known weaknesses in security, see
[Known gaps](security.md#known-gaps) in `security.md`.

## Contents

- [Deploy the app to a server](#deploy-the-app-to-a-server)
- [Merge our RAGdoll and The Candidate branches](#merge-our-ragdoll-and-the-candidate-branches)
- [Replace the EU placeholders with real EU laws](#replace-the-eu-placeholders-with-real-eu-laws)
- [Add more Norwegian laws](#add-more-norwegian-laws)
- [Improve accessibility further](#improve-accessibility-further)
- [Set up several agents at once](#set-up-several-agents-at-once)

## Deploy the app to a server

**Today:** the frontend only runs locally (`npm run dev`). RAGdoll and Keycloak are deployed by IMTEL
at `https://iplvr.it.ntnu.no/backend`, but counselors can't use the app without someone running it
on their own machine.

**Next:** run the app on a server in IMTEL's test environment, so counselors can use it from a
browser. Everything the deployment needs, the environment variables and a checklist before the
first deploy, is in [`deployment.md`](deployment.md). What is still to be agreed with IMTEL
(Tobias and Erik): the URL, what triggers a deploy, and who has access.

## Merge our RAGdoll and The Candidate branches

**Today:** the app needs changes we made in the other two repos, and they live on our own branches:

| Repo          | Our branch     | What it adds                                                                                                                                                                                                                                                                                                  |
| ------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RAGdoll       | `tdt4290/main` | Saved templates, job seeker profiles, publishing to The Candidate, ratings of replies, the fix that makes temperature work, and letting The Candidate's client key chat with the observer agent ([IMTEL/RAGdoll#164](https://github.com/IMTEL/RAGdoll/pull/164))                                              |
| The Candidate | `tdt4290/main` | Listing only published agents, read with the client key ([IMTEL/The-Candidate#38](https://github.com/IMTEL/The-Candidate/pull/38)), and «Avslutt intervju» in the pause menu, which shows the observer's feedback on the interview ([IMTEL/The-Candidate#39](https://github.com/IMTEL/The-Candidate/pull/39)) |

On IMTEL's `main` of RAGdoll, the app starts but these features fail.

**Next:** merge both into IMTEL's `main`, together with IMTEL, so a deployment does not depend on
our branches. Afterwards, update the README, [`deployment.md`](deployment.md) and the sensor guide,
which tell readers to check out `tdt4290/main`.

## Replace the EU placeholders with real EU laws

**Today:** under **Lover og paragrafer** in a legal template, the EU section only has placeholders
(«EU lov 1» to «EU lov 3», shown as «Kommer senere»). They can't be ticked, and the interviewer is
never told about them (`legalParagraphPlaceholders` in
[`src/data/legal-templates.ts`](../src/data/legal-templates.ts)).

**Next:** replace each placeholder with a real EU law or directive that matters in a hiring
process, written in plain words with a link to the official source, the same way as the Norwegian
paragraphs. How to add one: [Add a built-in stillingsmal, legal paragraph or avatar](extending.md#add-a-built-in-stillingsmal-legal-paragraph-or-avatar).

This needs someone with legal knowledge. Which laws to include, and the plain-language summary of
each, should be written or checked by an expert, not by the team alone. A wrong summary would make
the interviewer give wrong answers about the job seeker's rights.

## Add more Norwegian laws

**Today:** four built-in paragraphs: likestillings- og diskrimineringsloven § 30 and
arbeidsmiljøloven §§ 9-3, 13-1 and 13-4 (`builtInLegalParagraphs` in
[`src/data/legal-templates.ts`](../src/data/legal-templates.ts)). Their wording has not been checked
by the customer yet.

**Next:** have the customer check the four paragraphs, then add more rules that matter in a job
interview, for example on references, background checks or personal data in the application. A
new paragraph is added to the standard template «Rettigheter i ansettelsesprosessen» by itself,
and counselors can tick it in their own legal templates. As with the EU laws, the content should be
checked by someone who knows the law.

## Improve accessibility further

**Today:** every page, dialog and menu is checked against WCAG 2.1 AA with axe in the end-to-end
tests, in light and dark mode (`e2e/accessibility.spec.ts`, see
[`e2e-testing.md`](e2e-testing.md)). axe finds missing labels and low contrast, but it can't tell
whether a label makes sense or whether focus goes to the right place.

**Next:**

- Go through every icon button, chip and interactive element, and check that its `aria-label` says
  what it does, in Norwegian.
- Check where focus goes when a dialog opens and closes, when a wizard step changes, when a new
  chat message or observer feedback arrives, and after an item is deleted.
- Test the main flows with a screen reader (VoiceOver or NVDA) and with the keyboard only, and add
  what comes out of it as end-to-end tests where it can be automated.

## Set up several agents at once

**Today:** the wizard makes one agent at a time. To make several similar agents, for example the
same job for several job seekers or the same job seeker at different difficulties, the counselor
sets up one, then uses **Klon** on the agent page for each copy and edits it.

**Next:** let the counselor make several agents in one go. For example, choose more than one
interviewer type in the wizard, and get one agent for each combination, each saved with
`POST /api/agents` as today. Open questions: how the last step shows several agents, how they are
named, and whether they are published together.
