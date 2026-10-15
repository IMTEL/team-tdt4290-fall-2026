// A stand-in for Keycloak and RAGdoll, so the e2e tests run without Docker, secrets or IDUN.
// Playwright starts it (see playwright.config.ts). Everything is kept in memory and lost on exit.
//
// Keycloak: just enough OpenID Connect for NextAuth's Keycloak provider. There is no login form:
// every visit to the authorize endpoint logs in a brand-new user, so each test starts with no
// agents, templates or profiles, and tests running in parallel never see each other's data.
//
// RAGdoll: the endpoints src/server/ragdoll.ts and src/lib/auth-options.ts call, with the same
// request and response shapes. Chat replies are canned; no LLM is involved.
//
// Only Node built-ins, so it runs with plain `node tests/support/mock-backend.mjs`.

import { createServer } from 'node:http';
import { createHash, generateKeyPairSync, randomBytes, randomUUID, sign } from 'node:crypto';

const PORT = Number(process.env.MOCK_BACKEND_PORT ?? 8181);
const ORIGIN = `http://localhost:${PORT}`;
const REALM_PATH = '/realms/ragdoll';
const OIDC_PATH = `${REALM_PATH}/protocol/openid-connect`;
const ISSUER = `${ORIGIN}${REALM_PATH}`;
const OIDC = `${ORIGIN}${OIDC_PATH}`;

const SESSION_TTL_MS = 15 * 60 * 1000;
const REFRESH_TTL_MS = 24 * 60 * 60 * 1000;

/** Every chat reply starts with this, followed by the last user message. Tests look for it. */
const CHAT_REPLY_PREFIX = 'Mock-svar:';

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

function decodeJwt(token) {
  try {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
  } catch {
    return null;
  }
}

let userCount = 0;
/** Authorization code → the user it logs in, until the token endpoint redeems it. */
const pendingCodes = new Map();

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
/** RAGdoll session or refresh token → sub. */
const sessions = new Map();
const refreshTokens = new Map();

function dataFor(sub) {
  if (!users.has(sub)) {
    users.set(sub, { agents: [], templates: [], profiles: [], settings: {} });
  }
  return users.get(sub);
}

function issueSession(sub) {
  const sessionToken = randomUUID();
  sessions.set(sessionToken, sub);
  return sessionToken;
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

/** The user behind the request's Bearer token, or null. */
function userFromBearer(req, tokens = sessions) {
  const token = (req.headers.authorization ?? '').replace(/^Bearer /, '');
  const sub = tokens.get(token);
  return sub ? dataFor(sub) : null;
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
    const pending = pendingCodes.get(body.code);
    if (!pending) return send(res, 400, { error: 'invalid_grant' });
    pendingCodes.delete(body.code);

    const { user, clientId, nonce } = pending;
    const issuedAt = Math.floor(Date.now() / 1000);
    const idToken = signJwt({
      iss: ISSUER,
      sub: user.sub,
      aud: clientId,
      iat: issuedAt,
      exp: issuedAt + 300,
      ...(nonce ? { nonce } : {}),
      name: user.name,
      preferred_username: user.email,
      email: user.email,
    });
    return send(res, 200, {
      access_token: `access-${createHash('sha256').update(user.sub).digest('hex')}`,
      token_type: 'Bearer',
      expires_in: 300,
      id_token: idToken,
    });
  }

  if (path === `${OIDC_PATH}/userinfo`) {
    return send(res, 200, {});
  }

  if (path === `${OIDC_PATH}/logout`) {
    return redirect(res, url.searchParams.get('post_logout_redirect_uri') ?? '/');
  }

  // RAGdoll: login and sessions

  if (path === '/api/login' && method === 'POST') {
    const claims = decodeJwt((await readBody(req)).token ?? '');
    if (!claims?.sub) return send(res, 401, { detail: 'Invalid token' });

    dataFor(claims.sub);
    const refreshToken = randomUUID();
    refreshTokens.set(refreshToken, claims.sub);
    return send(res, 200, {
      session_token: issueSession(claims.sub),
      refresh_token: refreshToken,
      session_token_ttl: SESSION_TTL_MS,
      refresh_token_ttl: REFRESH_TTL_MS,
      name: claims.name ?? null,
      picture: null,
    });
  }

  if (path === '/api/refresh' && method === 'POST') {
    const token = (req.headers.authorization ?? '').replace(/^Bearer /, '');
    const sub = refreshTokens.get(token);
    if (!sub) return send(res, 401, { detail: 'Invalid refresh token' });
    return send(res, 200, { session_token: issueSession(sub), session_token_ttl: SESSION_TTL_MS });
  }

  if (path === '/api/logout') {
    const token = (req.headers.authorization ?? '').replace(/^Bearer /, '');
    sessions.delete(token);
    return send(res, 200, { ok: true });
  }

  // RAGdoll: chat. Uses the agent's access key, not a session.

  if (path === '/api/chat/ask' && method === 'POST') {
    const body = await readBody(req);
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

  // RAGdoll: everything below needs a session.

  const data = userFromBearer(req);
  if (!data) return send(res, 401, { detail: 'Not signed in' });

  // Language models: the default, which the app always offers, and one more to choose.

  if (path === '/get_models' && method === 'POST') {
    return send(res, 200, [{ name: 'openai/gpt-oss-120b' }, { name: 'mock/test-model' }]);
  }

  // Agents

  if (path === '/agents/' && method === 'GET') return send(res, 200, data.agents);

  if (path === '/update-agent/' && method === 'POST') {
    const body = await readBody(req);
    if (!body.id) {
      const agent = { ...body, id: objectId(), last_updated: now() };
      data.agents.push(agent);
      return send(res, 200, agent);
    }
    const index = data.agents.findIndex((agent) => agent.id === body.id);
    if (index === -1) return send(res, 404, { detail: 'Agent not found' });
    const old = data.agents[index];
    // Like RAGdoll: empty keys keep the stored ones.
    data.agents[index] = {
      ...body,
      llm_api_key: body.llm_api_key || old.llm_api_key,
      embedding_api_key: body.embedding_api_key || old.embedding_api_key,
      last_updated: now(),
    };
    return send(res, 200, data.agents[index]);
  }

  const agentId = url.searchParams.get('agent_id');
  const findAgent = (id) => data.agents.find((agent) => agent.id === id);

  if (path === '/fetch-agent') {
    const agent = findAgent(agentId);
    return agent ? send(res, 200, agent) : send(res, 401, { detail: 'Not your agent' });
  }

  if (path === '/chat-access-key') {
    return findAgent(agentId)
      ? send(res, 200, { key: `chat-key-${agentId}` })
      : send(res, 401, { detail: 'Not your agent' });
  }

  if (path === '/delete-agent') {
    data.agents = data.agents.filter((agent) => agent.id !== agentId);
    return send(res, 200, null);
  }

  const collaborators = path.match(/^\/agents\/([^/]+)\/collaborators$/);
  if (collaborators) {
    return findAgent(decodeURIComponent(collaborators[1]))
      ? send(res, 200, { is_owner: true, collaborators: [] })
      : send(res, 404, { detail: 'Agent not found' });
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
