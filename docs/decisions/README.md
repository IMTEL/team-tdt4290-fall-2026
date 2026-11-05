# Decisions

<!-- One file per design decision (NNNN-short-slug.md): context, options considered, decision, consequences, date. Record anything that changes how we build, such as the frontend stack or reusing RAGdollChat. -->

Each file here records one decision that changes how we build: the context, the options we
weighed, what we chose and what follows from it. They are short on purpose, and they are not
rewritten when things change later. A decision that is replaced gets a new file, and the old one's
status says which file replaced it.

| #                                                         | Decision                                                                          | Date       | Status   |
| --------------------------------------------------------- | --------------------------------------------------------------------------------- | ---------- | -------- |
| [0001](0001-own-chat-component.md)                        | Our own chat component instead of RAGdollChat's                                   | 2026-09-28 | Accepted |
| [0002](0002-mui-with-css-modules.md)                      | MUI with CSS Modules for the UI                                                   | 2026-09-22 | Accepted |
| [0003](0003-publish-to-the-candidate.md)                  | Publishing is a flag in RAGdoll, read by The Candidate with one shared client key | 2026-10-22 | Accepted |
| [0004](0004-stateless-backend-for-frontend.md)            | Our server is a stateless backend for the frontend; RAGdoll stores everything     | 2026-09-30 | Accepted |
| [0005](0005-form-wizard-instead-of-configuration-chat.md) | Counselors set up an agent in a form wizard, not in a configuration chat          | 2026-10-23 | Accepted |

## Adding a decision

1. Copy the layout of an existing file: a title with the next free number, then **Status**,
   **Date** and **Issues**, then the sections _Context_, _Options_ (if there were any), _Decision_
   and _Consequences_.
2. Name it `NNNN-short-slug.md`, with the next free number. Numbers are never reused.
3. Add a row to the table above, and link the decision from the part of
   [`architecture.md`](../architecture.md) it explains.
