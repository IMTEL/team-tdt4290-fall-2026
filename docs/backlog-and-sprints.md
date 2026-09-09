# Backlog and sprints

**Window:** 9 September 2026 – 10 November 2026.

**Team:** 4 people. **2 coding days/week.** **1 meeting day** (planning, retro, customer, lectures). Do not code on meeting day.

**Budget:** ~26 effective feature person-days. Calendar math is 64. Do not plan against 64. **Uke 40 (28 Sep–4 Oct)** is reduced capacity.

**Owners**

- **P** Profile
- **M** Matcher
- **C** Company + mock data
- **U** UI + Verifier
- **Shared:** schema + LLM wrapper (P leads, all agree)

**Counsellor-visible capabilities (freeze at four)**

1. Import seekers + listings
2. Open seeker → ready top-k jobs + WHY
3. Answer ≤5 MCQ → list shrinks, answers persist
4. Background batch so the list is already there

## P0 — must demo

- Schema + SQLite + README on two laptops
- Mock listings, 10 companies, 15 synthetic seekers (JSON first; PDFs later)
- Import listings CSV/JSON + seeker JSON (PDF import in Sprint 4)
- Hybrid matcher + background top-k + `feature_hits`
- Seeker list + seeker page with template WHY
- Verifier ≤5 MCQs that shrink the list + persist prefs + drop reasons
- Grounding test + decision log + prototype banner
- Next batch uses stored preferences (visit 2 asks fewer questions)

## P1 — only if P0 already demos

- Phase B LLM WHY rewrite
- PDF extract + quality flag
- Refresh one seeker
- Filter relax + `filter_relaxed`
- Thumbs up/down for the report

## P2 — cut without guilt

- RAGdoll company-doc chat
- Allowlisted HTTP fetch
- Embeddings / LLM-as-judge rerank
- Extra culture questions beyond the split-power set
- Streamlit rewrite, company-profile admin screen
- Live scrape, CrewAI, 10 agents, NAV integration, OCR, vector DB as a gate, forking RAGdoll

**Cut order if time dies:** RAGdoll helper → PDF extract → LLM WHY (keep template) → extra culture questions. **Do not cut** import, match list, or questions that shrink the list. PDF extract is the slip, not Verifier.

## Pre-sprint — 9–13 Sep 2026

Freeze schema, stack (FastAPI + Jinja + SQLite), mock inventory. Written non-goals: RAGdoll is not the app; no CrewAI. No feature heroics.

## Sprint 1 — 14–27 Sep — ready match-list

**Capacity:** ~6 feature days (setup tax).

**Goal:** Data in. Matcher runs on mock seeker JSON. Counsellor sees a seeker list. Jobs can still be thin. **No PDF LLM. No scrape.**

**Ceremony:** planning Mon 14 · customer if booked · retro Fri 25.

| ID | Story | Owner | Done when |
| --- | --- | --- | --- |
| S1-1 | Repo runs on two laptops | Shared (U) | README: install → start → see empty app |
| S1-2 | Frozen schemas in repo | Shared (P) | Six tables; no silent field adds |
| S1-3 | LLM wrapper (one call, logged) | Shared (P) | One function, provider behind env var |
| S1-4 | Mock listings + CSV/JSON import | **C** | ≥20 listings in store; re-import does not duplicate wildly |
| S1-5 | ≥15 synthetic seekers as JSON | **P** | Seekers in store; **no real names/SSN** |
| S1-6 | Matcher score on those JSON profiles | **M** | Hard filter + overlap score writes `match_result` |
| S1-7 | Seeker list screen | **U** | Names + status; prototype banner (ETH3) |
| S1-8 | Sprint notes | All (U collects) | ½ page: what we built, what we skipped |

**Stretch:** import screen (else CLI is OK). **Cut:** pretty CSS, auth, RAGdoll, Verifier questions.

**Exit:** teammate opens the app and sees named seekers.

## Sprint 2 — 28 Sep–11 Oct — company + Phase A

**Capacity:** ~6 feature days. **Uke 40 = half speed.** Pair. No new science projects.

**Goal:** Opening a seeker shows top-k + template WHY. Companies joined. Verifier A flags. Protect Matcher. Do not start Verifier B early and leave matching half-done.

**Ceremony:** planning Mon 28 · customer · retro Fri 9 Oct.

| ID | Story | Owner | Done when |
| --- | --- | --- | --- |
| S2-1 | Hybrid match: hard filter then score | **M** | Filters (city / seniority / language). Score = skill overlap + location + seniority + education. **No LLM-as-judge.** |
| S2-2 | Background batch: all seekers → top-k + reasons | **M** | One command / startup job matches everyone. Store k=5–10 + `feature_hits`. Counsellor does not wait. |
| S2-3 | 10 mock company profiles | **C** | Opposite culture tags. `shift_work` as fact. Label `source: mock`. |
| S2-4 | Listing → company join | **C** | Every shown job has company tags or “no company info” |
| S2-5 | Seeker page: profile + jobs + template WHY | **U** | Click seeker → see jobs. Empty = “not matched yet” |
| S2-6 | Verifier A flags | **U** + **M** | Unknown prefs tagged; caution may hard-drop; Matcher still ignores culture |
| S2-7 | List status: `matched` / `needs_questions` / `failed` | **U** | List tells the truth after batch |
| S2-8 | Report: matcher formula + 1 screenshot | All | Weights written in one paragraph |

**Stretch:** LLM WHY sentences (else template bullets). **Cut:** vector DB, OCR, scrape, judge-all-pairs.

**Exit:** open a seeker, see a shortlist **without clicking Run**.

## Sprint 3 — 12–25 Oct — questions shrink the list

**Capacity:** ~10 feature days (best sprint). U is the bottleneck — M/C help U, do not invent agents.

**Goal:** This is the demo slice. WHY the counsellor can read. Questions shrink the list. Answers stick.

**Ceremony:** planning Mon 12 · customer · retro Fri 23.

| ID | Story | Owner | Done when |
| --- | --- | --- | --- |
| S3-1 | Question bank, max 5 MCQ | **U** (+ C for tags) | Closed flags only: remote, commute, industry, social workplace, shifts / formality. Skip allowed. **No LLM-invented questions.** Split-power: do not ask a flag that would not change the list. |
| S3-2 | Answers shrink / re-rank on the same page | **U** | List updates in place. Stop if ≤3 jobs. |
| S3-3 | Persist answers on seeker | **U** (schema from P) | Reload → answers still there. Skip does **not** persist as a fact. |
| S3-4 | Drop reasons | **U** | Counsellor can see why a job vanished |
| S3-5 | Grounding test (NFR3) | **M** | Fixture fails if WHY invents a skill |
| S3-6 | New import → batch picks it up | **M** | Add 1 seeker or 1 listing, re-run, list updates |
| S3-7 | Decision trace dump | **M** | JSON: filters, scores, drops, questions — report-ready |
| S3-8 | 8-minute demo script (draft) | All (U leads) | Click path written |
| S3-9 | Ethics stub | Shared | Synthetic CVs, no scrape, local store, mock culture labelled |

**Stretch:** Phase B LLM WHY rewrite · hidden-jobs expander · thumbs log. **Cut:** chatbot verifier, 6th question, Explainer-as-fifth-owner, live company fetch.

**Exit:** same seeker: list ready → 3 clicks → shorter list → preference in SQLite.

## Sprint 4 — 26 Oct–8 Nov — glue + optional PDF

**Feature freeze: Monday 2 November.** Then 9–10 Nov: demo + docs only. No new features.

**Capacity:** ~6–8 feature days, then write-up.

**Goal:** Next night-run uses saved answers. Boring errors. Demo on a second machine. PDF extract is P1 — if it slips, demo still uses mock JSON.

**Ceremony:** planning Mon 26 · freeze check 2 Nov · customer demo window 9–10 Nov · retro after demo.

| ID | Story | Owner | Done when |
| --- | --- | --- | --- |
| S4-1 | Next batch uses stored preferences | **M** + **U** | Visit 2 → **0 questions** (or fewer). List already small. |
| S4-2 | Boring failures | **U** + **P** | Missing file / LLM down / zero matches → message, not stack trace |
| S4-3 | Import more data without breaking old matches | **C** + **P** | Second CSV + extra seekers; old seekers still open |
| S4-4 | Feature freeze 2 Nov | All | After 2 Nov: bugs + docs only |
| S4-5 | Demo on a second machine | **U** leads | Scripted 8 min, mock data |
| S4-6 | Report: architecture = built system | All | Diagram, formula, before/after list sizes, blackboard-vs-workflow paragraph |
| S4-7 | Limitations page | All | Honest non-goals |
| S4-8 | PDF extract (P1) | **P** | Synthetic single-column PDFs → JSON → rematch. Skip without guilt if late. |

**Stretch before 2 Nov only:** Refresh-one-seeker · thumbs · LLM WHY rewrite. **Cut after 2 Nov:** everything new.

**Exit 10 Nov:** 8-minute demo + this docs folder. System is a **pipeline with 4 named modules**, not a chatbot society.

## Who does what (so nobody collides)

| Sprint | P | M | C | U |
| --- | --- | --- | --- | --- |
| 1 | schemas, LLM wrap, mock seeker JSON | store + score | listings import | list screen + README |
| 2 | help statuses | hybrid + batch | company JSON | seeker page |
| 3 | preference field | WHY template + traces + re-run | join companies, tags | questions + shrink + persist |
| 4 | PDF extract or error paths | prefs in batch | extra import | demo machine + freeze |

If uke 40 empties Sprint 2: **keep the matcher even if WHY is bullets.** Do not start Verifier B and leave matching half-done.

## Ceremonies (meeting day only)

1. **Planning (sprint start):** pick must stories only. Stretch stays in the parking lot. Count heads for uke 40 in Sprint 2.
2. **Customer (when booked):** show the **exit** of the last sprint, not slides of future agents.
3. **Retro (sprint end):** 3 bullets — keep / drop / blocked. Update the cut list if someone started scrape / CrewAI / RAGdoll-as-product.

**Rule:** if a fifth counsellor-visible idea appears, it waits until after 10 Nov.

## Definition of done (research demo, not a product)

A supervisor sits through an 8-minute script on **another teammate’s machine** with the same mocks: import → ready list → point at a skill that exists on the seeker → answers shrink the list → preference is in SQLite → say this is not auto-hire. No scrape, no RAGdoll, no NAV in the demo.

A slice is done when the README path runs on a teammate’s machine, failures are boring, and there is a trace (log, screenshot, or saved JSON) for the report. The architecture diagram must match **what you built**.
