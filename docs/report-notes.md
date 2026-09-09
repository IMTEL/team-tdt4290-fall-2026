# Report notes

Paste-ready text. Each block is self-contained. Audience: NTNU student researchers.

## Why not a classic blackboard

A classic blackboard (Hearsay-II / BB1) lets knowledge sources decide *who runs next*. That fits problems whose solution path is unknown. Our path is known: ingest, extract, match, explain, then optionally ask the counsellor. We therefore use a shared store with a fixed schema and a worker that runs a fixed pipeline. Agents still read and write the same case file; they do not compete for control. That keeps the multi-agent idea (specialists, shared memory, logged handoffs) without a control loop we cannot test in eight weeks.

## Why matching is not an LLM

Matching must be repeatable. The same seeker and the same job should get the same rank tomorrow. An LLM judge does not do that: scores drift, rank order jitters, and the model may invent overlap that is not in the profile. Counsellors also need a method they can inspect (filters, skill overlap, location, seniority), not “the model said 0.73.” We therefore score with a hybrid of hard filters and a transparent formula, and we spend the language model on extraction and on writing the WHY from those feature hits.

## Why company profiles are mocked

We do not yet have a legal data feed for employer culture. Scraping review sites (Glassdoor, Indeed, and similar) is typically against their terms of use, and company web pages are copyrighted. Mock profiles let Matcher and Verifier run on day one, on a *fixed schema* that a later allowlisted fetch can fill. Culture tags in the mock are invented for the demo and must be labelled as such; presenting invented workplace facts as real is the ethical risk, not using a known employer name as a fixture.

## Why the Verifier asks the counsellor, not the job seeker

This system is decision support for the counsellor, not a chatbot for the job seeker. The counsellor already holds preferences that a CV does not (commute, remote, culture, shifts) and is the person who will act on the shortlist. Asking the seeker would change the product, add consent and GDPR burden we cannot carry in a student prototype, and block overnight matching on a human who is not in the loop. The Verifier therefore asks a few closed questions in the session; answers are stored as seeker preferences for the next background run.

## Why explanations must not invent skills

The WHY text is advice the counsellor may read aloud. If it claims a skill that is not on the extracted profile, the list becomes untrustworthy and can push a seeker toward a role they cannot actually do. Ranking and narrative are therefore split: Matcher emits only structured reasons from extracted fields; the explanation step may rephrase those reasons, not add new skills, titles, or experience. If a fact is missing, the sentence is omitted.

## Why RAGdoll is not the product

IMTEL RAGdoll is a hosted RAG *chat* platform (document upload, chunking, FAISS, Keycloak, chat API at iplvr.it.ntnu.no). Its “scraper” splits PDFs and HTML into RAG chunks; it is not a company-website crawler and not a job matcher. Forking that stack would spend the project on auth, Mongo, and chat UX instead of matching. We build our own counsellor app. RAGdoll may later be an optional helper for questions over *public* company or job text, never the store for CVs and never the ranking engine.

## Why background + session is two phases

A ready list cannot wait for a human, and useful preference questions cannot be asked at 03:00 with nobody at the desk. Phase A therefore runs unattended for all seekers: extract, match, drop only obvious clashes, tag unknown preferences, draft WHY. Phase B runs when the counsellor opens a seeker: a few closed questions, then re-filter the *existing* shortlist and persist answers. Merging the phases either blocks overnight work on questions, or never asks them. Skipping questions still leaves a complete product: a ranked list with grounded reasons.

## Ethics stub (short section)

Purpose is a student prototype for matching **synthetic** seekers to **mock** job text. No real personal data in development or demo. Company pages are not crawled in v1; culture tags are invented and labelled. Counsellor answers are stored as **profile attributes**, not chat transcripts. Agent decision logs use synthetic ids, scores, and feature hits. Matching does not use protected characteristics. The list is **decision support**, not a hiring decision. Cloud/LLM use only with synthetic data unless NTNU/Sikt has approved a DPIA. Remaining risk is proxy bias and over-trust in scores — mitigated by a human counsellor and the prototype disclaimer.

## Related-work sentence (blackboard vs workflow)

We considered a classic opportunistic blackboard and conversational multi-agent frameworks (CrewAI, AutoGen). We rejected both: the task graph is known, the human protocol is a form, and evaluation needs typed module I/O. The implemented pattern is a **role-based multi-agent workflow** on a shared store.

## Demo claims we will not make

We will not claim this is NAV software, Arbeidsplassen, or a production HR ranker. We will not claim live company culture was measured. We will not claim the LLM ranked the jobs.
