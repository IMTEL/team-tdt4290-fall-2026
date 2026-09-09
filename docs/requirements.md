# Requirements

MoSCoW. One sentence each. Testable. Counsellor-only demo by **10 November 2026**.

## Functional — MUST

**FR1** The app SHALL be counsellor-only: no job-seeker login, no apply button, no seeker portal.

**FR2** A counsellor SHALL import CSV/JSON listings and seeker records (JSON in v1; PDF CVs as Sprint 4 P1), and a second import of the same formats SHALL add more records.

**FR3** After import, a Profile step SHALL write one seeker row with `seeker_id`, `headline`, `target_roles`, `skills`, `education_level`, `languages`, `city`, `work_mode`, `seniority`, `years_experience`, `availability`, `matching_text`, `extract_quality`. Counsellor answers SHALL live in `preference`, not inside the extract blob.

**FR4** The system SHALL load mock `company` records keyed by `company_id`, and every listing with that `company_id` SHALL reuse the same profile.

**FR5** A background job SHALL match every seeker with usable `extract_quality` against open listings and SHALL store a top-k list (`k` between 5 and 10, default 8) before the counsellor opens that seeker.

**FR6** Opening a seeker with status `matched` SHALL show the stored top-k without running matching in that page load, each row showing `title`, `company_name`, `rank`, `score`, and `why_text`.

**FR7** Matching SHALL hard-filter then score with named features (skill overlap, location, seniority, languages, work_mode, education, title) and SHALL write `feature_hits` listing only values present on the seeker and the listing.

**FR8** `why_text` SHALL NOT name a skill, title, city, or language absent from that seeker’s extracted fields and that listing’s fields. Phase A MAY be a template from `feature_hits`. Phase B MAY LLM-rewrite leftover jobs only.

**FR9** On the seeker page, a Verifier SHALL show at most 5 multiple-choice questions in one form (closed options including skip), SHALL stop if the list is already ≤3 or a flag would not split the list, then SHALL shrink and/or re-rank the visible list without a page change.

**FR10** Submitted answers SHALL be stored as `preference` rows (not as a chat log), a reload SHALL keep the shrunk list, and the next background match SHALL reuse those preferences. Skip SHALL NOT persist as a fact.

**FR11** The seeker list SHALL show exactly one status in `{imported, profile_ready, matched, needs_questions, stale, error}` that updates after import, extract, match, unanswered questions, failed jobs, and data that invalidates an old match.

**FR12** Each listing SHALL include `listing_id`, `title`, `company_id`, `company_name`, `city`, `work_mode`, `seniority`, `skills[]`, `languages[]`, `education_min`, `description`.

**FR13** Each company SHALL include `company_id`, `name`, `industry`, `size_band`, `locations`, `work_mode_default`, `shift_work`, five culture traits (`social_gatherings`, `team_collaboration`, `work_intensity`, `structure_formality`, `learning_support`) each with `level` / `confidence` / `evidence`, `synthesis` (5–10 sentences), `caution_flags`, and `source=mock`.

**FR14** Each `match_result` SHALL include `seeker_id`, `listing_id`, `rank`, `score`, `feature_scores`, `feature_hits`, `filter_relaxed`, `why_text`, `dropped_reason`, `run_id`.

## Functional — SHOULD

**FR15** After Phase B answers, the Verifier SHALL rewrite `why_text` only for jobs still on the list, and dropped jobs SHALL keep `dropped_reason` and SHALL not get new prose.

**FR16** If hard filters would yield zero jobs, matching SHALL relax the tightest filter, set `filter_relaxed=true`, and still store a top-k.

**FR17** Re-import of an existing `seeker_id` or `listing_id` SHALL update that record and set related seekers to `stale` until the next background match.

**FR18** The UI SHALL show a named empty state when there are no seekers or no matches, and a named error state when extract or match fails, both without a blank screen.

## Functional — COULD

**FR19** A Refresh control on one seeker SHALL re-run match + explain for that seeker only and replace that seeker’s stored top-k.

**FR20** Matching MAY add cosine similarity of `matching_text` vs listing `description` as one extra feature in `feature_scores`, with weight documented and default off.

## Quality — MUST

**NFR1** One background pass over the demo corpus (≤50 seekers × ≤200 listings; ship ≥15 × ≥40) SHALL finish in ≤10 minutes on a student laptop.

**NFR2** After the counsellor submits the last of the ≤5 answers, the visible job list SHALL update in ≤10 seconds.

**NFR3** A fixture test SHALL fail if any `why_text` invents a skill, title, city, or language absent from that seeker’s extracted fields and that listing’s fields.

**NFR4** The counsellor-visible demo dataset SHALL include ≥15 synthetic seekers, ≥40 listings, and ≥10 mock companies with distinct culture trait levels so at least one answer changes the shortlist.

## Quality — SHOULD / COULD

**NFR5 (SHOULD)** Profile extract of one PDF SHALL finish in ≤30 seconds or set status `error` with a readable reason.

**NFR6 (COULD)** The seeker page MAY record a counsellor thumbs-up/thumbs-down per remaining job for the research report.

## Ethics — MUST

**ETH1** Dev, tests, and demo SHALL use only synthetic CVs, fake personas, mock listings, and mock company profiles; real personal CVs SHALL be rejected or never stored.

**ETH2** The system SHALL NOT fetch Glassdoor, Indeed, Facebook, LinkedIn, or other employee-review sites, and v1 company data SHALL be local mock files with `source=mock`.

**ETH3** Every seeker-detail view SHALL show that the list is decision support for a counsellor, not an auto-hire or auto-reject.

**ETH4** Matching and Verifier SHALL NOT read or infer gender, age, ethnicity, disability, photo, or name-origin, and those fields SHALL be absent from stored profiles.

## Ethics — SHOULD

**ETH5** Each company card or WHY block SHALL state that culture tags are invented for the demo when `source=mock`.

**ETH6** Decision logs SHALL store synthetic ids, `score`, `feature_hits`, and `dropped_reason` only, not raw CV text or question chat.

## Out of scope (MUST NOT)

**OOS1** Live website crawling, review-site scrape, or a production company-web agent.

**OOS2** Job-seeker self-serve app, auto-apply, emails to employers, or NAV/university system integration.

**OOS3** CrewAI/AutoGen chat-of-agents, more than five named modules, ESCO/skill ontologies, or LLM-as-judge of every seeker–job pair.

**OOS4** RAGdoll as the product, matcher, or CV store (optional later helper only).

**OOS5** Real personal data in cloud LLM APIs or shared repos without NTNU/Sikt DPIA.

**OOS6** Production multi-user auth, billing, or a claim that the ranker is a hiring decision.
