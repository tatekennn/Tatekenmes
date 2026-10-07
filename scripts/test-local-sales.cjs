const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');

const origin = process.env.LOCAL_TEST_ORIGIN || 'http://127.0.0.1:3000';
const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
const label = `qa${suffix}`;
const secondLabel = `b${suffix}`;
const email = `${label}@example.test`;
const password = `Qa-${suffix}!`;

async function json(path, init = {}) {
  const response = await fetch(`${origin}${path}`, init);
  return { response, body: await response.json() };
}

function cleanUp() {
  const db = new DatabaseSync('.data/haki-local.sqlite');
  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (!user) return;
  db.exec('PRAGMA foreign_keys = ON; BEGIN IMMEDIATE');
  try {
    db.prepare('DELETE FROM payment_events WHERE checkout_id IN (SELECT id FROM checkout_sessions WHERE user_id = ?)').run(user.id);
    db.prepare('DELETE FROM checkout_sessions WHERE user_id = ?').run(user.id);
    db.prepare('DELETE FROM dns_records WHERE ascii_label IN (?, ?)').run(label, secondLabel);
    db.prepare('DELETE FROM audit_logs WHERE user_id = ?').run(user.id);
    db.prepare('DELETE FROM orders WHERE user_id = ?').run(user.id);
    db.prepare('DELETE FROM domains WHERE user_id = ?').run(user.id);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
    db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

async function run() {
  const registration = await json('/api/local-auth', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'register', email, password }),
  });
  assert.equal(registration.response.status, 200);
  const cookie = registration.response.headers.get('set-cookie').split(';')[0];
  const headers = { 'content-type': 'application/json', cookie };

  const claim = await json('/api/local-sales', {
    method: 'POST', headers, body: JSON.stringify({ action: 'claim', label }),
  });
  assert.equal(claim.response.status, 200);
  assert.equal(claim.body.status, 'free-claimed');

  const duplicate = await json('/api/local-sales', {
    method: 'POST', headers, body: JSON.stringify({ action: 'claim', label: secondLabel }),
  });
  assert.equal(duplicate.response.status, 409);

  const dns = await json('/api/local-sales/dns', {
    method: 'POST', headers,
    body: JSON.stringify({ action: 'create-record', asciiLabel: label, host: '@', type: 'TXT', value: `verification=${suffix}` }),
  });
  assert.equal(dns.response.status, 200);
  assert.equal(dns.body.domain.records[0].type, 'TXT');

  await json('/api/local-auth', { method: 'DELETE', headers: { cookie } });
  const login = await json('/api/local-auth', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'login', email, password }),
  });
  assert.equal(login.response.status, 200);

  const rejected = await json('/api/local-auth', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'login', email, password: 'wrong-password' }),
  });
  assert.equal(rejected.response.status, 401);
}

run()
  .then(() => console.log('local free claim flow: ok'))
  .finally(cleanUp)
  .catch((error) => { console.error(error); process.exitCode = 1; });
