# Career counsellor multi-agent system — docs index

Student research pack for a **counsellor-only** matching demo. Not application code. Not NAV software.

**Locked product choices**

- Matching runs in the **background**. A counsellor opens a job seeker and sees a ready list.
- A **Verifier** may ask the counsellor short questions to shrink that list.
- Data is **mocked / synthetic**. Real personal CVs are out of scope.

**How to read this folder**

| File | What it is |
| --- | --- |
| [architecture.md](architecture.md) | Refined system: modules, two phases, stack, RAGdoll decision |
| [data-model.md](data-model.md) | Six SQLite tables (the “blackboard”), enums, who reads/writes |
| [requirements.md](requirements.md) | MoSCoW requirements (FR / NFR / ETH / out of scope) |
| [backlog-and-sprints.md](backlog-and-sprints.md) | Capacity, P0/P1/P2 backlog, four 2-week sprints (14 Sep–10 Nov 2026) |
| [report-notes.md](report-notes.md) | Short paragraphs you can paste into the course report |

**One-line system.** Four named modules (Profile, Matcher, Company, Verifier) share a SQLite store. Only the Verifier is a true agent (it may ask a human). Matcher is a formula, not an LLM.

**Time box.** 4 students, 2 coding days/week + 1 meeting day, ~26 effective feature days, sprints starting **14 September 2026**, demo/docs **9–10 November 2026**.
