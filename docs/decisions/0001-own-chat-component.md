# 0001. Own chat component instead of RAGdollChat's

- **Status:** Accepted
- **Date:** 2026-09-28
- **Issues:** #13, #12

## Decision

We build our own chat component instead of reusing RAGdollChat's UI, because RAGdollChat uses a
different stack (Tailwind + shadcn + axios) from ours (MUI + CSS Modules). We still follow its API
usage (`POST /api/chat/ask` with `agent_id`, `access_key` and `chat_log`).

## Consequence

The criterion "use component from RAGDoll" in #13 has to be changed to "chat interface".
