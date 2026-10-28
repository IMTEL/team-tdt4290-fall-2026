// A stand-in for Keycloak and RAGdoll, so the e2e tests run without Docker, secrets or IDUN.
// Playwright starts it (see playwright.config.ts). Everything is kept in memory and lost on exit.
//
// Keycloak: just enough OpenID Connect for NextAuth's Keycloak provider. There is no login form:
// every visit to the authorize endpoint logs in a brand-new user, so each test starts with no
// agents, templates or profiles, and tests running in parallel never see each other's data.
//
// RAGdoll: the endpoints src/server/ragdoll.ts calls, with the same request and response shapes.
// Like the real RAGdoll it takes Keycloak's ID token as the Bearer token on every request, and
// keeps no session of its own. Chat replies are canned; no LLM is involved.
//
// Only Node built-ins, so it runs with plain `node e2e/support/mock-backend.mjs`.

import { createServer } from 'node:http';
import {
  createHash,
  generateKeyPairSync,
  randomBytes,
  randomUUID,
  sign,
  verify,
} from 'node:crypto';

const PORT = Number(process.env.MOCK_BACKEND_PORT ?? 8181);
/** The app's Keycloak client id, KEYCLOAK_CLIENT_ID in playwright.config.ts. */
const CLIENT_ID = 'ragdoll-config';
const ORIGIN = `http://localhost:${PORT}`;
const REALM_PATH = '/realms/ragdoll';
const OIDC_PATH = `${REALM_PATH}/protocol/openid-connect`;
const ISSUER = `${ORIGIN}${REALM_PATH}`;
const OIDC = `${ORIGIN}${OIDC_PATH}`;

/** How long an ID token lasts, in seconds. The app refreshes it at Keycloak when it runs out. */
const ID_TOKEN_TTL_S = 300;
const REFRESH_TTL_S = 24 * 60 * 60;

/** Every chat reply starts with this, followed by the last user message. Tests look for it. */
const CHAT_REPLY_PREFIX = 'Mock-svar:';

/** A quote the observer makes up. The app must never show it, since the candidate never said it. */
const INVENTED_QUOTE = 'Jeg er verdens beste selger';

/**
 * The observer's reply: one point quoting the candidate's first answer in the transcript, and one
 * with an invented quote.
 */
function observerReply(chatLog = []) {
  const transcript = chatLog[0]?.content ?? '';
  const firstAnswer = transcript.match(/^Kandidat: (.*)$/m)?.[1] ?? '';
  // The text RAGdoll hands on: the `message` of its JSON contract, in prompts/observer.nb.md's format.
  const point = (label, quote) => `${label}: ${quote} | Mock-kommentar. | Mock-tips.`;
  return {
    response: {
      id: randomUUID(),
      model: 'mock',
      context_used: [],
      response: [point('Bra', firstAnswer), point('Bedre', INVENTED_QUOTE)].join('\n'),
    },
  };
}

// --- Keycloak --------------------------------------------------------------------------------

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const KEY_ID = 'mock-key';
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: KEY_ID, alg: 'RS256', use: 'sig' };

const base64url = (value) => Buffer.from(value).toString('base64url');

/** An RS256-signed JWT that openid-client accepts as an ID token. */
function signJwt(payload) {
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: KEY_ID }));
  const body = base64url(JSON.stringify(payload));
  const signature = sign('sha256', Buffer.from(`${header}.${body}`), privateKey);
  return `${header}.${body}.${signature.toString('base64url')}`;
}

/** The claims of an ID token this mock signed and that has not expired, or null. */
function verifyJwt(token) {
  const [header, body, signature] = token.split('.');
  if (!header || !body || !signature) return null;
  const valid = verify(
    'sha256',
    Buffer.from(`${header}.${body}`),
    publicKey,
    Buffer.from(signature, 'base64url'),
  );
  if (!valid) return null;
  try {
    const claims = JSON.parse(Buffer.from(body, 'base64url').toString());
    return claims.exp * 1000 > Date.now() ? claims : null;
  } catch {
    return null;
  }
}

/** Keycloak's token response: a fresh ID token for the user, and a refresh token for later. */
function issueTokens(user, clientId, nonce) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const idToken = signJwt({
    iss: ISSUER,
    sub: user.sub,
    aud: clientId,
    azp: clientId,
    iat: issuedAt,
    exp: issuedAt + ID_TOKEN_TTL_S,
    ...(nonce ? { nonce } : {}),
    name: user.name,
    preferred_username: user.email,
    email: user.email,
  });
  const refreshToken = randomUUID();
  refreshTokens.set(refreshToken, { user, clientId });
  return {
    access_token: `access-${createHash('sha256').update(user.sub).digest('hex')}`,
    token_type: 'Bearer',
    expires_in: ID_TOKEN_TTL_S,
    refresh_token: refreshToken,
    refresh_expires_in: REFRESH_TTL_S,
    id_token: idToken,
  };
}

let userCount = 0;
/** Authorization code → the user it logs in, until the token endpoint redeems it. */
const pendingCodes = new Map();
/** Refresh token → the user and client it was issued to. */
const refreshTokens = new Map();

function newUser() {
  userCount += 1;
  return {
    sub: randomUUID(),
    name: `Test Bruker ${userCount}`,
    email: `test${userCount}@example.com`,
  };
}

// --- RAGdoll state ---------------------------------------------------------------------------

/** sub → the user's data. */
const users = new Map();

function dataFor(sub) {
  if (!users.has(sub)) {
    users.set(sub, { agents: [], templates: [], profiles: [], settings: {} });
  }
  return users.get(sub);
}

// --- HTTP helpers ----------------------------------------------------------------------------

function send(res, status, body, headers = {}) {
  const json = body === undefined ? '' : JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
  res.end(json);
}

function redirect(res, location) {
  res.writeHead(302, { Location: location });
  res.end();
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString();
  if (!text) return {};
  if ((req.headers['content-type'] ?? '').includes('application/x-www-form-urlencoded')) {
    return Object.fromEntries(new URLSearchParams(text));
  }
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

/**
 * The user behind the request's Bearer token, or null. Like RAGdoll, it must be a valid ID token
 * for our client: an access token has another audience.
 */
function userFromBearer(req) {
  const claims = verifyJwt((req.headers.authorization ?? '').replace(/^Bearer /, ''));
  if (!claims?.sub || claims.aud !== CLIENT_ID) return null;
  return dataFor(claims.sub);
}

const now = () => new Date().toISOString();

/** RAGdoll stores everything in MongoDB, whose ids are 24 hex characters. The app checks this. */
const objectId = () => randomBytes(12).toString('hex');

// --- Routes ----------------------------------------------------------------------------------

async function handle(req, res) {
  const url = new URL(req.url, ORIGIN);
  const path = url.pathname;
  const method = req.method;

  if (path === '/health') return send(res, 200, { ok: true });

  // Keycloak

  if (path === `${REALM_PATH}/.well-known/openid-configuration`) {
    return send(res, 200, {
      issuer: ISSUER,
      authorization_endpoint: `${OIDC}/auth`,
      token_endpoint: `${OIDC}/token`,
      userinfo_endpoint: `${OIDC}/userinfo`,
      jwks_uri: `${OIDC}/certs`,
      end_session_endpoint: `${OIDC}/logout`,
      response_types_supported: ['code'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256'],
      token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
      code_challenge_methods_supported: ['S256'],
    });
  }

  if (path === `${OIDC_PATH}/certs`) {
    return send(res, 200, { keys: [jwk] });
  }

  if (path === `${OIDC_PATH}/auth`) {
    // No login form: log a new user straight in and send the browser back to NextAuth.
    const code = randomUUID();
    pendingCodes.set(code, {
      user: newUser(),
      clientId: url.searchParams.get('client_id'),
      nonce: url.searchParams.get('nonce'),
    });
    const back = new URL(url.searchParams.get('redirect_uri'));
    back.searchParams.set('code', code);
    const state = url.searchParams.get('state');
    if (state) back.searchParams.set('state', state);
    return redirect(res, back.href);
  }

  if (path === `${OIDC_PATH}/token` && method === 'POST') {
    const body = await readBody(req);

    // The app asks for a new ID token when the old one runs out (src/lib/auth-options.ts).
    if (body.grant_type === 'refresh_token') {
      const issued = refreshTokens.get(body.refresh_token);
      if (!issued) return send(res, 400, { error: 'invalid_grant' });
      refreshTokens.delete(body.refresh_token);
      return send(res, 200, issueTokens(issued.user, issued.clientId));
    }

    const pending = pendingCodes.get(body.code);
    if (!pending) return send(res, 400, { error: 'invalid_grant' });
    pendingCodes.delete(body.code);

    const { user, clientId, nonce } = pending;
    return send(res, 200, issueTokens(user, clientId, nonce));
  }

  if (path === `${OIDC_PATH}/userinfo`) {
    return send(res, 200, {});
  }

  if (path === `${OIDC_PATH}/logout`) {
    return redirect(res, url.searchParams.get('post_logout_redirect_uri') ?? '/');
  }

  // RAGdoll: chat. Uses the agent's access key, not a session.

  if (path === '/api/chat/ask' && method === 'POST') {
    const body = await readBody(req);
    if (body.agent_id === 'mock-observer') return send(res, 200, observerReply(body.chat_log));
    const lastUserMessage = [...(body.chat_log ?? [])].reverse().find((m) => m.role === 'user');
    return send(res, 200, {
      response: {
        id: randomUUID(),
        model: 'mock',
        context_used: [],
        response: `${CHAT_REPLY_PREFIX} ${lastUserMessage?.content ?? 'Hei!'}`,
      },
    });
  }

  // RAGdoll: everything below needs the user's ID token.

  const data = userFromBearer(req);
  if (!data) return send(res, 401, { detail: 'Not signed in' });

  // Language models: the default, which the app always offers, and one more to choose.

  if (path === '/get_models' && method === 'POST') {
    return send(res, 200, [{ name: 'openai/gpt-oss-120b' }, { name: 'mock/test-model' }]);
  }

  // Agents

  const findAgent = (id) => data.agents.find((agent) => agent.id === id);

  if (path === '/agents' && method === 'GET') return send(res, 200, data.agents);

  if (path === '/agents' && method === 'POST') {
    const agent = { ...(await readBody(req)), id: objectId(), last_updated: now() };
    data.agents.push(agent);
    return send(res, 200, { id: agent.id });
  }

  const accessKeys = path.match(/^\/agents\/([^/]+)\/accesskeys$/);
  if (accessKeys && method === 'POST') {
    const id = decodeURIComponent(accessKeys[1]);
    return findAgent(id)
      ? send(res, 200, { key: `chat-key-${id}` })
      : send(res, 404, { detail: 'Agent not found' });
  }

  const collaborators = path.match(/^\/agents\/([^/]+)\/collaborators$/);
  if (collaborators) {
    return findAgent(decodeURIComponent(collaborators[1]))
      ? send(res, 200, { is_owner: true, collaborators: [] })
      : send(res, 404, { detail: 'Agent not found' });
  }

  // Publishing to The Candidate. RAGdoll answers with the whole agent; the app reads the fields
  // that say whether and how it is published.
  const publication = path.match(/^\/agents\/([^/]+)\/(publish|unpublish)$/);
  if (publication && method === 'POST') {
    const agent = findAgent(decodeURIComponent(publication[1]));
    if (!agent) return send(res, 404, { detail: 'Agent not found' });
    if (publication[2] === 'publish') {
      const body = await readBody(req);
      Object.assign(agent, {
        is_published: true,
        public_name: body.public_name,
        public_description: body.public_description,
        published_at: now(),
      });
    } else {
      // Like RAGdoll: a hidden agent keeps its public name and description.
      Object.assign(agent, {
        is_published: false,
        public_name: agent.public_name ?? '',
        public_description: agent.public_description ?? '',
        published_at: null,
      });
    }
    return send(res, 200, agent);
  }

  const agentPath = path.match(/^\/agents\/([^/]+)$/);
  if (agentPath) {
    const id = decodeURIComponent(agentPath[1]);
    const index = data.agents.findIndex((agent) => agent.id === id);
    if (index === -1) return send(res, 404, { detail: 'Agent not found' });
    if (method === 'GET') return send(res, 200, data.agents[index]);
    if (method === 'POST') {
      const body = await readBody(req);
      const old = data.agents[index];
      // Like RAGdoll: empty keys keep the stored ones, and only publish and unpublish change
      // whether and how the agent is published.
      data.agents[index] = {
        ...body,
        id,
        llm_api_key: body.llm_api_key || old.llm_api_key,
        embedding_api_key: body.embedding_api_key || old.embedding_api_key,
        is_published: old.is_published,
        public_name: old.public_name,
        public_description: old.public_description,
        published_at: old.published_at,
        last_updated: now(),
      };
      return send(res, 200, data.agents[index]);
    }
    if (method === 'DELETE') {
      data.agents.splice(index, 1);
      return send(res, 200, null);
    }
  }

  // Templates and profiles: the same create/read/update/delete shape.

  for (const [prefix, key] of [
    ['/templates', 'templates'],
    ['/profiles', 'profiles'],
  ]) {
    if (path === prefix && method === 'GET') {
      const type = url.searchParams.get('type');
      const items = type ? data[key].filter((item) => item.type === type) : data[key];
      return send(res, 200, [...items].reverse()); // newest first
    }
    if (path === prefix && method === 'POST') {
      const item = { ...(await readBody(req)), id: objectId() };
      data[key].push(item);
      return send(res, 200, item);
    }
    const match = path.match(new RegExp(`^${prefix}/([^/]+)$`));
    if (match) {
      const id = decodeURIComponent(match[1]);
      const index = data[key].findIndex((item) => item.id === id);
      if (index === -1) return send(res, 404, { detail: 'Not found' });
      if (method === 'GET') return send(res, 200, data[key][index]);
      if (method === 'PUT') {
        data[key][index] = { ...(await readBody(req)), id };
        return send(res, 200, data[key][index]);
      }
      if (method === 'DELETE') {
        data[key].splice(index, 1);
        return send(res, 200, null);
      }
    }
  }

  // User settings

  if (path.startsWith('/user-settings/')) {
    if (method === 'PUT') data.settings = await readBody(req);
    return send(res, 200, data.settings);
  }

  return send(res, 404, { detail: `Mock backend has no ${method} ${path}` });
}

createServer((req, res) => {
  handle(req, res).catch((error) => {
    console.error('Mock backend failed:', error);
    send(res, 500, { detail: 'Mock backend error' });
  });
}).listen(PORT, () => {
  console.warn(`Mock Keycloak + RAGdoll listening on ${ORIGIN}`);
});
