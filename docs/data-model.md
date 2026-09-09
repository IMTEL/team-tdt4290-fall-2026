# Data model

One SQLite file. Six tables. This is the shared store (the “blackboard” in the report).

English **field keys**. Norwegian **labels** in the UI. Join on `company_id` and `listing_id`.

Skills are always lowercase tokens (`python`, not `Python` / `JS`). Use a tiny alias map (`js` → `javascript`). No ESCO.

Languages are always `nb` / `en`.

Mock corpus: **≥15 seekers, ≥40 listings, ≥10 companies** with opposite culture tags.

## Enums (same on both sides)

- `work_mode`: `onsite` | `hybrid` | `remote` | `unknown`
- `seniority`: `intern` | `junior` | `mid` | `senior` | `lead` | `unknown`
- `education_level` / `education_min`: `none` | `vocational` | `bachelor` | `master` | `phd` | `unknown`
- Culture `level`: `high` | `medium` | `low` | `unknown`
- Culture keys (exactly five): `social_gatherings`, `team_collaboration`, `work_intensity`, `structure_formality`, `learning_support`
- `extract_quality`: `ok` | `partial` | `failed`
- Seeker `pipeline_status`: `imported` | `profile_ready` | `matched` | `needs_questions` | `stale` | `error`
- Listing `status`: `open` | `closed`
- Match row `status`: `kept` | `hidden`

## Tables

### 1. `company`

Load mock JSON once. Reuse for every seeker.

- `company_id` (pk)
- `name`, `aliases` (json)
- `industry`, `size_band` (`1-10` / `11-50` / `51-200` / `201-1000` / `1000+` / `unknown`)
- `locations` (json cities)
- `work_mode_default`
- `shift_work` (`yes` / `no` / `unknown`) — **fact**, not a sixth culture trait
- `traits` (json: the five keys → `{level, confidence, evidence}`)
- `synthesis` (5–10 sentences, labelled mock / self-description)
- `caution_flags` (json: `{flag, severity, summary}`)
- `source` (`mock`)

Drop from v1: orgnr, NACE, website scrape fields, review scores.

### 2. `listing`

- `listing_id` (pk)
- `company_id` (fk, nullable until name resolve)
- `company_name` (display + resolve; **not** the join key)
- `title`, `city`, `work_mode`, `seniority`
- `skills` (json canonical tokens)
- `languages` (json codes)
- `education_min`
- `description` (1–4 short paragraphs, for WHY citations)
- `status` (`open` / `closed`)

If `company_id` is empty after import, matching still works on listing fields. Verifier cannot attach culture until resolve. UI must tolerate missing company.

### 3. `seeker`

Profile pipeline writes this. Until Sprint 4, load from mock JSON.

- `seeker_id` (pk)
- `display_name`, `headline`
- `target_roles` (json)
- `skills` (json canonical — same form as listing)
- `education_level` (highest; compared to `education_min`)
- `education_note` (one line, e.g. “NTNU CS MSc”)
- `experience_note` (one line)
- `languages` (json codes)
- `city`, `work_mode` (from CV if stated, else `unknown`)
- `seniority`, `years_experience`
- `availability` (`immediate` / `after_date` / `unknown`) + `available_from`
- `matching_text` (short blob, no PII — for WHY, **not** for scoring)
- `extract_quality`
- `pipeline_status`

Drop: projects, certs, nested education/experience arrays, personality, contact, photos.

### 4. `preference`

Counsellor answers. Not a chat log.

- `seeker_id` + `pref_key` (pk)
- `level` (`high` / `medium` / `low` / `unknown`, or the matching enum for `work_mode` / `shift_work`)
- `source` (`counsellor`)
- `answered_at`

`pref_key` is one of the five culture keys, or `work_mode`, or `shift_work`. Skip / don’t-know does **not** persist as a fact.

### 5. `match_run`

- `run_id` (pk)
- `algo_version`, weights snapshot
- `started_at`, `finished_at`
- `seeker_count`, `listing_count`
- optional note if filters emptied the pool

### 6. `match_result`

One row per (seeker, listing) **in the pool** (top ~10–20), not every rejected pair.

- `run_id`, `seeker_id`, `listing_id`
- `rank`, `score` (0–100)
- `feature_scores` (json 0–1: skills, seniority, education, language, location, title)
- `feature_hits` (json: matched skills, missing skills, city / work_mode / seniority notes)
- `filter_relaxed` (bool)
- `status` (`kept` / `hidden`)
- `dropped_reason` (null if kept; Verifier writes this)
- `why_text` (null until Verifier template / rewrite)

Matcher does **not** write thousands of rejected pairs. Empty-after-filters is a note on `match_run`.

## Who reads / writes

| Table | Matcher | Verifier | Profile | Company loader / import |
| --- | --- | --- | --- | --- |
| `company` | Read facts only: locations, `work_mode_default`, `shift_work`. **Ignore traits + synthesis.** Ignore caution for scoring. | Read traits, synthesis, caution, `shift_work` | — | **Write** |
| `listing` | Read match fields | Read `company_id`, title, city, `work_mode` | — | **Write** |
| `seeker` | Read skills, education, languages, city, work_mode, seniority, years, target_roles, extract_quality. Skip if `failed`. | Read city / work_mode and unknown prefs | **Write** | — |
| `preference` | No (Phase A must not wait on the counsellor) | **Write** answers; **read** to skip known keys | — | — |
| `match_run` | **Write** | — | — | — |
| `match_result` | **Write** rank, score, feature_*, `filter_relaxed`. Leave `why_text` empty. | **Write** `status=hidden` + `dropped_reason`; re-rank remaining; write `why_text` | — | — |

**Culture does not go through Matching.** Verifier shrinks the existing pool. WHY is prose on top of structured hits, not a second ranker. WHY must not add skills that are not in `feature_hits`.

## Ten mock companies (distinct tags)

Culture in these rows is **invented for the demo**. Label `source: mock` in the UI.

| Employer | Distinct facts / traits | Why the Verifier can split |
| --- | --- | --- |
| Equinor ASA | Hybrid office, English OK, safety-critical, formal | Energy office vs welfare vs rig work |
| NAV | Norwegian required, hybrid, mission-driven, no shifts | Public sector, local offices |
| Trondheim kommune | Norwegian, local only, onsite, unionized | Must live near Trondheim |
| Bekk Consulting AS | High tempo, client travel, high social, hybrid | Travel + social office vs quiet research |
| St. Olavs hospital HF | `shift_work=yes`, onsite, hierarchical, Norwegian | Kills remote / no-shift preferences |
| Fjordlyt AS (fictional startup) | Flat, remote OK, English, high tempo, startup | Small / uncertain vs NAV stability |
| Norsk Hydro ASA | Plant shifts, onsite, safety, unionized | Industrial shifts, not hospital |
| SINTEF AS | Research, independent work, hybrid, English, no shifts | Quiet project work vs Bekk social |
| Kirkens Bymisjon | Mission, onsite, Norwegian, high social | Values + field work |
| Odfjell Drilling AS | Offshore rotation, onsite, safety, English | Rotation, not hospital shifts, not Equinor office |

Fjordlyt is fictional on purpose so startup tags are not presented as facts about a real firm.

## Matcher scoring (plain language)

1. **Hard filters:** listing `open`; location (same city, or remote, or stored “will relocate”); work mode if known; required languages if known. Must-have skills are **soft** unless it is a license.
2. If the pool is empty, relax one filter, set `filter_relaxed=true`.
3. **Score survivors (freeze weights in config):** skill overlap (largest), experience band, seniority, title/occupation overlap, education floor. Total 0–100.
4. Keep top-k (default **8**, range 5–10) plus a hidden pool up to ~20 so Verifier can drop jobs without rematching the world.

## What not to store

Raw CV text in logs. Chat transcripts as the system of record. Protected attributes (gender, age, ethnicity, disability, photo, name-origin). Review-site scores. Embeddings in v1.
