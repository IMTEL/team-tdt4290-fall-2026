// Configures the local Keycloak from RAGdoll's docker-compose.local.yml so that logging out works.
//
// Our log out sends the user to Keycloak's logout endpoint, which then redirects back to /login.
// Keycloak only allows that redirect if the client lists it under "Valid post logout redirect
// URIs", and RAGdoll's realm file does not set it. `+` means "same as the valid redirect URIs".
//
// Every developer's Keycloak runs in their own Docker volume, so run this once per machine, and
// again after `docker compose ... down -v`. Running it twice does no harm.
//
// Usage: npm run keycloak:setup   (RAGdoll must be running)

import { execFileSync } from 'node:child_process';

// These match RAGdoll's docker-compose.local.yml and keycloak/realm-ragdoll.json.
const CONTAINER = 'ragdoll-keycloak';
const REALM = 'ragdoll';
const CLIENT_ID = 'ragdoll-config';
const ADMIN_USER = 'admin';
const ADMIN_PASSWORD = 'admin';

/** Runs kcadm.sh (Keycloak's admin CLI) inside the Keycloak container and returns its output. */
function kcadm(...args) {
  return execFileSync('docker', ['exec', CONTAINER, '/opt/keycloak/bin/kcadm.sh', ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function fail(message, error) {
  console.error(`\n✗ ${message}`);
  const detail = error?.stderr?.toString().trim() || error?.message;
  if (detail) console.error(`  ${detail}`);
  process.exit(1);
}

try {
  const running = execFileSync('docker', ['inspect', '-f', '{{.State.Running}}', CONTAINER], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
  if (running !== 'true') throw new Error(`${CONTAINER} exists but is not running`);
} catch (error) {
  fail(
    `The Keycloak container "${CONTAINER}" is not running. Start RAGdoll first:\n` +
      '  cd ../RAGdoll && docker compose -f docker-compose.local.yml up -d',
    error,
  );
}

try {
  kcadm(
    'config',
    'credentials',
    '--server',
    'http://localhost:8080',
    '--realm',
    'master',
    '--user',
    ADMIN_USER,
    '--password',
    ADMIN_PASSWORD,
  );
} catch (error) {
  fail(
    'Could not log in to Keycloak as admin. If it just started, wait half a minute and try again.',
    error,
  );
}

let id;
try {
  id = kcadm(
    'get',
    'clients',
    '-r',
    REALM,
    '-q',
    `clientId=${CLIENT_ID}`,
    '--fields',
    'id',
    '--format',
    'csv',
    '--noquotes',
  );
} catch (error) {
  fail(`Could not look up the client "${CLIENT_ID}" in realm "${REALM}".`, error);
}
if (!id) fail(`The client "${CLIENT_ID}" does not exist in realm "${REALM}".`);

try {
  kcadm('update', `clients/${id}`, '-r', REALM, '-s', 'attributes."post.logout.redirect.uris"=+');
} catch (error) {
  fail('Could not update the client.', error);
}

console.log(
  `✓ Keycloak is set up: "${CLIENT_ID}" in realm "${REALM}" now allows redirects after logout.`,
);
