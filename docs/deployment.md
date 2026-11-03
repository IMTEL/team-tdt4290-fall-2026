# Deployment

<!-- How the application is deployed to IMTEL test environment: URL, what triggers a deploy, required environment variables and who has access. Agreed with Tobias and Erik. -->

## Status

| Part                                    | Where it runs today                                                                                   |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Our frontend                            | **Not deployed yet.** It runs locally (`npm run dev`, see the [README](../README.md#running-locally)) |
| RAGdoll and Keycloak                    | Deployed by IMTEL at `https://iplvr.it.ntnu.no/backend`, and locally with Docker Compose              |
| Shared configurator and observer agents | On the deployed RAGdoll (`RAGDOLL_API_URL`)                                                           |
| The Candidate                           | Unity app built by IMTEL; reads published agents from RAGdoll                                         |

<!-- TODO: fill in the frontend's URL, what triggers a deploy and who has access once IMTEL's test environment is ready (contact: Tobias and Erik). -->

Nothing deploys automatically. CI only checks pull requests and pushes to `main`
([`CONTRIBUTING.md`](../CONTRIBUTING.md#what-ci-checks)).

## What a deployment needs

The app is a standard Next.js server with no database of its own, so any host that runs Node.js 24
works. On the server:

```bash
npm ci
npm run build
npm run start            # serves on port 3000; use -p to choose another (npx next start -p 8080)
```

The build reads no secrets, but `npm run start` needs every variable in
[`.env.example`](../.env.example), set in the host's environment (not in a committed file):

| Variable                                          | Value in a deployment                                                                                      |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `NEXTAUTH_URL`                                    | The public URL of the app, with `https://`, for example `https://<host>/` (Keycloak sends users back here) |
| `NEXTAUTH_SECRET`                                 | A new random value (`openssl rand -base64 32`). Never reuse the local one                                  |
| `BACKEND_API_URL`                                 | The RAGdoll the counselors' agents are stored in, for example `https://iplvr.it.ntnu.no/backend`           |
| `RAGDOLL_API_URL`                                 | The RAGdoll that holds the shared configurator and observer agents. Usually the same as above              |
| `RAGDOLL_CONFIGURATOR_AGENT_ID`, `..._ACCESS_KEY` | The shared configurator agent on that RAGdoll                                                              |
| `RAGDOLL_OBSERVER_AGENT_ID`, `..._ACCESS_KEY`     | The shared observer agent on that RAGdoll                                                                  |
| `KEYCLOAK_ISSUER`                                 | The deployed Keycloak's realm URL, `https://<keycloak-host>/realms/ragdoll`                                |
| `KEYCLOAK_CLIENT_ID`, `KEYCLOAK_CLIENT_SECRET`    | The deployed realm's client for this app. The secret is not the local `ragdoll-config-secret`              |
| `IDUN_API_KEY`                                    | The project's IDUN key                                                                                     |

## Checklist before the first deploy

- [ ] **RAGdoll runs our branch.** The deployed RAGdoll must have the changes from `tdt4290/main`
      (saved templates, job seeker profiles, publishing, ratings, the temperature fix). On IMTEL's
      `main` the app starts, but those features fail.
- [ ] **Keycloak knows the app's URL.** In the deployed realm, the client's **Valid redirect URIs**
      must include `<NEXTAUTH_URL>/api/auth/callback/keycloak`, and **Valid post logout redirect
      URIs** must include `<NEXTAUTH_URL>/login`. `npm run keycloak:setup` only does this for the
      local Keycloak.
- [ ] **HTTPS.** Serve the app over HTTPS only. The app sends HSTS, so once a browser has seen it
      over HTTPS it refuses plain HTTP for two years.
- [ ] **The prompts in RAGdoll match the repo.** Paste `prompts/configurator.nb.md` and
      `prompts/observer.nb.md` into the shared agents on the deployed RAGdoll.
- [ ] **One instance.** The chat rate limit is kept in the server's memory. With more than one
      instance each counts on its own ([Known gaps](security.md#known-gaps)).
- [ ] **Smoke test.** Run the [manual end-to-end check](testing.md#manual-end-to-end-check)
      against the deployed URL.
