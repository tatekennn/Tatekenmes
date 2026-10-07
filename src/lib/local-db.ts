import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type {
  DemoDnsRecord,
  DemoPurchase,
  DnsMode,
  DnsRecordType,
  SubdomainValidation,
} from './subdomain-sale';
import { BASE_ZONE_ASCII, MAX_SUBDOMAINS } from './config';

const DATABASE_DIR = path.join(process.cwd(), '.data');
const DATABASE_PATH = path.join(DATABASE_DIR, 'haki-local.sqlite');
const PRODUCTION_SOLD_SNAPSHOT = 12;
const MAX_RECORDS_PER_DOMAIN = 25;
export const LOCAL_SESSION_COOKIE = 'haki_local_session';

export type LocalUser = { id: string; email: string };
export type LocalDnsRecordInput = {
  host: string;
  fqdn: string;
  type: DnsRecordType;
  value: string;
  priority: number | null;
};

export type LocalCheckout = {
  id: string;
  token: string;
  domain: string;
  expiresAt: string;
};

export class LocalDnsError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

type DatabaseGlobal = typeof globalThis & { hakiLocalDatabase?: DatabaseSync };
const globalForDatabase = globalThis as DatabaseGlobal;

function createDnsTable(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS dns_records (
      id TEXT PRIMARY KEY,
      ascii_label TEXT NOT NULL REFERENCES domains(ascii_label) ON DELETE CASCADE,
      host TEXT NOT NULL,
      fqdn TEXT NOT NULL,
      type TEXT NOT NULL,
      value TEXT NOT NULL,
      priority INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS dns_records_domain_idx ON dns_records(ascii_label);
    CREATE INDEX IF NOT EXISTS dns_records_fqdn_idx ON dns_records(fqdn);
  `);
}

function migrateDatabase(db: DatabaseSync) {
  const userColumns = db.prepare('PRAGMA table_info(users)').all() as unknown as Array<{ name: string }>;
  if (!userColumns.some((column) => column.name === 'password_salt')) {
    db.exec('ALTER TABLE users ADD COLUMN password_salt TEXT');
  }
  if (!userColumns.some((column) => column.name === 'password_hash')) {
    db.exec('ALTER TABLE users ADD COLUMN password_hash TEXT');
  }
  const domainColumns = db.prepare('PRAGMA table_info(domains)').all() as unknown as Array<{ name: string }>;
  if (!domainColumns.some((column) => column.name === 'dns_mode')) {
    db.exec("ALTER TABLE domains ADD COLUMN dns_mode TEXT NOT NULL DEFAULT 'HOSTED'");
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS checkout_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      ascii_label TEXT NOT NULL UNIQUE,
      label TEXT NOT NULL,
      display_domain TEXT NOT NULL,
      amount_yen INTEGER NOT NULL,
      status TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      completed_at TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS checkout_sessions_user_idx ON checkout_sessions(user_id);
    CREATE TABLE IF NOT EXISTS payment_events (
      id TEXT PRIMARY KEY,
      checkout_id TEXT NOT NULL REFERENCES checkout_sessions(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  const dnsTable = db.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'dns_records'",
  ).get();
  if (!dnsTable) {
    createDnsTable(db);
    return;
  }

  const dnsColumns = db.prepare('PRAGMA table_info(dns_records)').all() as unknown as Array<{ name: string }>;
  if (dnsColumns.some((column) => column.name === 'id')) return;

  const legacyRows = db.prepare(
    'SELECT ascii_label AS asciiLabel, type, value, updated_at AS updatedAt FROM dns_records',
  ).all() as unknown as Array<{ asciiLabel: string; type: string; value: string; updatedAt: string }>;
  db.exec('ALTER TABLE dns_records RENAME TO dns_records_single_legacy');
  createDnsTable(db);
  const insert = db.prepare(`
    INSERT INTO dns_records
      (id, ascii_label, host, fqdn, type, value, priority, created_at, updated_at)
    VALUES (?, ?, '@', ?, ?, ?, NULL, ?, ?)
  `);
  for (const row of legacyRows) {
    if (row.type === 'HOSTED') continue;
    const fqdn = `${row.asciiLabel}.${BASE_ZONE_ASCII}`;
    insert.run(`dns_${randomUUID()}`, row.asciiLabel, fqdn, row.type, row.value, row.updatedAt, row.updatedAt);
    db.prepare("UPDATE domains SET dns_mode = 'CUSTOM' WHERE ascii_label = ?").run(row.asciiLabel);
  }
}

function database(): DatabaseSync {
  if (globalForDatabase.hakiLocalDatabase) {
    migrateDatabase(globalForDatabase.hakiLocalDatabase);
    return globalForDatabase.hakiLocalDatabase;
  }
  mkdirSync(DATABASE_DIR, { recursive: true });
  const db = new DatabaseSync(DATABASE_PATH);
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS domains (
      ascii_label TEXT PRIMARY KEY, display_domain TEXT NOT NULL, label TEXT NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id), order_id TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
      ascii_label TEXT NOT NULL UNIQUE REFERENCES domains(ascii_label),
      amount_yen INTEGER NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL REFERENCES users(id),
      ascii_label TEXT NOT NULL, action TEXT NOT NULL, detail TEXT NOT NULL, created_at TEXT NOT NULL
    );
  `);
  migrateDatabase(db);
  globalForDatabase.hakiLocalDatabase = db;
  return db;
}

function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function issueLocalSession(user: LocalUser): { token: string; user: LocalUser } {
  const db = database();
  const now = new Date().toISOString();
  const token = `local_${randomUUID()}_${randomUUID()}`;
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
    .run(tokenHash(token), user.id, expiresAt, now);
  return { token, user };
}

function passwordDigest(password: string, salt: string): Buffer {
  return scryptSync(password, salt, 64);
}

export function createLocalAccount(emailInput: string, password: string): { token: string; user: LocalUser } {
  const email = emailInput.trim().toLowerCase();
  const db = database();
  const existing = db.prepare('SELECT id, email, password_hash AS passwordHash FROM users WHERE email = ?')
    .get(email) as (LocalUser & { passwordHash: string | null }) | undefined;
  if (existing?.passwordHash) throw new LocalDnsError('このメールアドレスは登録済みです', 409);
  const user = existing ?? { id: `usr_${randomUUID()}`, email };
  const salt = randomBytes(16).toString('hex');
  const hash = passwordDigest(password, salt).toString('hex');
  if (existing) {
    db.prepare('UPDATE users SET password_salt = ?, password_hash = ? WHERE id = ?').run(salt, hash, user.id);
  } else {
    db.prepare(`
      INSERT INTO users (id, email, password_salt, password_hash, created_at) VALUES (?, ?, ?, ?, ?)
    `).run(user.id, email, salt, hash, new Date().toISOString());
  }
  return issueLocalSession(user);
}

export function authenticateLocalAccount(emailInput: string, password: string): { token: string; user: LocalUser } {
  const email = emailInput.trim().toLowerCase();
  const row = database().prepare(`
    SELECT id, email, password_salt AS passwordSalt, password_hash AS passwordHash
    FROM users WHERE email = ?
  `).get(email) as (LocalUser & { passwordSalt: string | null; passwordHash: string | null }) | undefined;
  if (!row?.passwordSalt || !row.passwordHash) throw new LocalDnsError('メールアドレスまたはパスワードが違います', 401);
  const actual = passwordDigest(password, row.passwordSalt);
  const expected = Buffer.from(row.passwordHash, 'hex');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new LocalDnsError('メールアドレスまたはパスワードが違います', 401);
  }
  return issueLocalSession({ id: row.id, email: row.email });
}

export function localUserForSession(token: string | undefined): LocalUser | null {
  if (!token) return null;
  const row = database().prepare(`
    SELECT users.id, users.email FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > ?
  `).get(tokenHash(token), new Date().toISOString()) as LocalUser | undefined;
  return row ?? null;
}

export function deleteLocalSession(token: string | undefined): void {
  if (token) database().prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash(token));
}

export function isLocalDomainPurchased(asciiLabel: string): boolean {
  return Boolean(database().prepare('SELECT 1 FROM domains WHERE ascii_label = ?').get(asciiLabel));
}

export function isLocalLabelUnavailable(asciiLabel: string): boolean {
  const db = database();
  const now = new Date().toISOString();
  db.prepare("DELETE FROM checkout_sessions WHERE status = 'pending' AND expires_at <= ?").run(now);
  return Boolean(db.prepare(`
    SELECT 1 FROM domains WHERE ascii_label = ?
    UNION ALL
    SELECT 1 FROM checkout_sessions
      WHERE ascii_label = ? AND (status = 'paid' OR (status = 'pending' AND expires_at > ?))
    LIMIT 1
  `).get(asciiLabel, asciiLabel, now));
}

export function localStock() {
  const row = database().prepare('SELECT COUNT(*) AS count FROM domains').get() as { count: number };
  const sold = Math.min(MAX_SUBDOMAINS, PRODUCTION_SOLD_SNAPSHOT + Number(row.count));
  return { total: MAX_SUBDOMAINS, sold, remaining: Math.max(0, MAX_SUBDOMAINS - sold) };
}

function recordRows(asciiLabel: string): DemoDnsRecord[] {
  return database().prepare(`
    SELECT id, host, fqdn, type, value, priority, updated_at AS updatedAt
    FROM dns_records WHERE ascii_label = ? ORDER BY host, type, created_at
  `).all(asciiLabel) as unknown as DemoDnsRecord[];
}

type DomainRow = {
  asciiLabel: string;
  displayDomain: string;
  label: string;
  email: string;
  orderId: string;
  createdAt: string;
  dnsMode: DnsMode;
};

function purchaseFromRow(row: DomainRow): DemoPurchase {
  return { ...row, records: recordRows(row.asciiLabel) };
}

export function localPurchasesForUser(userId: string): DemoPurchase[] {
  const rows = database().prepare(`
    SELECT domains.ascii_label AS asciiLabel, domains.display_domain AS displayDomain,
      domains.label, users.email, domains.order_id AS orderId,
      domains.created_at AS createdAt, domains.dns_mode AS dnsMode
    FROM domains JOIN users ON users.id = domains.user_id
    WHERE domains.user_id = ? ORDER BY domains.created_at DESC
  `).all(userId) as unknown as DomainRow[];
  return rows.map(purchaseFromRow);
}

function purchaseForUser(user: LocalUser, asciiLabel: string): DemoPurchase | null {
  return localPurchasesForUser(user.id).find((item) => item.asciiLabel === asciiLabel) ?? null;
}

function ensureOwned(db: DatabaseSync, user: LocalUser, asciiLabel: string) {
  const owned = db.prepare('SELECT 1 FROM domains WHERE ascii_label = ? AND user_id = ?').get(asciiLabel, user.id);
  if (!owned) throw new LocalDnsError('このドメインを変更する権限がありません', 403);
}

function audit(db: DatabaseSync, user: LocalUser, asciiLabel: string, action: string, detail: unknown, now: string) {
  db.prepare(`
    INSERT INTO audit_logs (user_id, ascii_label, action, detail, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(user.id, asciiLabel, action, JSON.stringify(detail), now);
}

export function createLocalPurchase(
  validation: Extract<SubdomainValidation, { ok: true }>,
  user: LocalUser,
  amountYen: number,
): DemoPurchase {
  const db = database();
  const now = new Date().toISOString();
  const orderId = `demo_${Date.now().toString(36)}_${randomUUID().slice(0, 8)}`;
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare(`
      INSERT INTO domains (ascii_label, display_domain, label, user_id, order_id, created_at, dns_mode)
      VALUES (?, ?, ?, ?, ?, ?, 'HOSTED')
    `).run(validation.asciiLabel, validation.displayDomain, validation.label, user.id, orderId, now);
    db.prepare(`
      INSERT INTO orders (id, user_id, ascii_label, amount_yen, status, created_at)
      VALUES (?, ?, ?, ?, 'demo-paid', ?)
    `).run(orderId, user.id, validation.asciiLabel, amountYen, now);
    audit(db, user, validation.asciiLabel, 'purchase', { orderId, amountYen }, now);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  return purchaseForUser(user, validation.asciiLabel)!;
}

export function createLocalFreeClaim(
  validation: Extract<SubdomainValidation, { ok: true }>,
  user: LocalUser,
): DemoPurchase {
  const db = database();
  const now = new Date().toISOString();
  const orderId = `free_${Date.now().toString(36)}_${randomUUID().slice(0, 8)}`;
  db.exec('BEGIN IMMEDIATE');
  try {
    const existing = db.prepare('SELECT 1 FROM domains WHERE user_id = ?').get(user.id);
    if (existing) throw new LocalDnsError('無料取得は1アカウントにつき1区画までです', 409);
    db.prepare(`
      INSERT INTO domains (ascii_label, display_domain, label, user_id, order_id, created_at, dns_mode)
      VALUES (?, ?, ?, ?, ?, ?, 'HOSTED')
    `).run(validation.asciiLabel, validation.displayDomain, validation.label, user.id, orderId, now);
    db.prepare(`
      INSERT INTO orders (id, user_id, ascii_label, amount_yen, status, created_at)
      VALUES (?, ?, ?, 0, 'free', ?)
    `).run(orderId, user.id, validation.asciiLabel, now);
    audit(db, user, validation.asciiLabel, 'free-claim', { orderId }, now);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  return purchaseForUser(user, validation.asciiLabel)!;
}

export function createLocalCheckout(
  validation: Extract<SubdomainValidation, { ok: true }>,
  user: LocalUser,
  amountYen: number,
): LocalCheckout {
  const db = database();
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const id = `chk_${randomUUID()}`;
  const token = `pay_${randomUUID()}_${randomUUID()}`;
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare("DELETE FROM checkout_sessions WHERE status = 'pending' AND expires_at <= ?").run(now);
    const unavailable = db.prepare(`
      SELECT 1 FROM domains WHERE ascii_label = ?
      UNION ALL
      SELECT 1 FROM checkout_sessions WHERE ascii_label = ? LIMIT 1
    `).get(validation.asciiLabel, validation.asciiLabel);
    if (unavailable) throw new LocalDnsError(`${validation.displayDomain} は申込済み、または決済中です`, 409);
    db.prepare(`
      INSERT INTO checkout_sessions
        (id, user_id, ascii_label, label, display_domain, amount_yen, status, token_hash, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
    `).run(
      id,
      user.id,
      validation.asciiLabel,
      validation.label,
      validation.displayDomain,
      amountYen,
      tokenHash(token),
      expiresAt,
      now,
    );
    audit(db, user, validation.asciiLabel, 'checkout-start', { checkoutId: id, amountYen, expiresAt }, now);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  return { id, token, domain: validation.displayDomain, expiresAt };
}

type CheckoutRow = {
  id: string;
  userId: string;
  email: string;
  asciiLabel: string;
  label: string;
  displayDomain: string;
  amountYen: number;
  status: string;
  tokenHash: string;
  expiresAt: string;
};

export function completeLocalCheckout(checkoutId: string, token: string, eventId: string): DemoPurchase {
  const db = database();
  const now = new Date().toISOString();
  db.exec('BEGIN IMMEDIATE');
  try {
    const row = db.prepare(`
      SELECT checkout_sessions.id, checkout_sessions.user_id AS userId, users.email,
        checkout_sessions.ascii_label AS asciiLabel, checkout_sessions.label,
        checkout_sessions.display_domain AS displayDomain, checkout_sessions.amount_yen AS amountYen,
        checkout_sessions.status, checkout_sessions.token_hash AS tokenHash,
        checkout_sessions.expires_at AS expiresAt
      FROM checkout_sessions JOIN users ON users.id = checkout_sessions.user_id
      WHERE checkout_sessions.id = ?
    `).get(checkoutId) as CheckoutRow | undefined;
    if (!row || row.tokenHash !== tokenHash(token)) throw new LocalDnsError('決済セッションを確認できません', 401);
    const user = { id: row.userId, email: row.email };
    if (row.status === 'paid') {
      db.exec('COMMIT');
      return purchaseForUser(user, row.asciiLabel)!;
    }
    if (row.status !== 'pending' || row.expiresAt <= now) {
      throw new LocalDnsError('決済セッションの有効期限が切れました', 410);
    }
    const existingEvent = db.prepare('SELECT 1 FROM payment_events WHERE id = ?').get(eventId);
    if (existingEvent) throw new LocalDnsError('同じ決済イベントは処理済みです', 409);
    const orderId = `demo_${Date.now().toString(36)}_${randomUUID().slice(0, 8)}`;
    db.prepare(`
      INSERT INTO domains (ascii_label, display_domain, label, user_id, order_id, created_at, dns_mode)
      VALUES (?, ?, ?, ?, ?, ?, 'HOSTED')
    `).run(row.asciiLabel, row.displayDomain, row.label, row.userId, orderId, now);
    db.prepare(`
      INSERT INTO orders (id, user_id, ascii_label, amount_yen, status, created_at)
      VALUES (?, ?, ?, ?, 'demo-paid', ?)
    `).run(orderId, row.userId, row.asciiLabel, row.amountYen, now);
    db.prepare("UPDATE checkout_sessions SET status = 'paid', completed_at = ? WHERE id = ?").run(now, row.id);
    db.prepare('INSERT INTO payment_events (id, checkout_id, event_type, created_at) VALUES (?, ?, ?, ?)')
      .run(eventId, row.id, 'checkout.completed', now);
    audit(db, user, row.asciiLabel, 'payment-webhook', { checkoutId: row.id, orderId, eventId }, now);
    db.exec('COMMIT');
    return purchaseForUser(user, row.asciiLabel)!;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export function cancelLocalCheckout(checkoutId: string, token: string): void {
  const db = database();
  const now = new Date().toISOString();
  db.exec('BEGIN IMMEDIATE');
  try {
    const row = db.prepare(`
      SELECT checkout_sessions.user_id AS userId, users.email,
        checkout_sessions.ascii_label AS asciiLabel, checkout_sessions.status,
        checkout_sessions.token_hash AS tokenHash
      FROM checkout_sessions JOIN users ON users.id = checkout_sessions.user_id
      WHERE checkout_sessions.id = ?
    `).get(checkoutId) as Pick<CheckoutRow, 'userId' | 'email' | 'asciiLabel' | 'status' | 'tokenHash'> | undefined;
    if (!row || row.tokenHash !== tokenHash(token)) throw new LocalDnsError('決済セッションを確認できません', 401);
    if (row.status === 'paid') throw new LocalDnsError('完了済みの決済はキャンセルできません', 409);
    db.prepare('DELETE FROM checkout_sessions WHERE id = ?').run(checkoutId);
    audit(db, { id: row.userId, email: row.email }, row.asciiLabel, 'checkout-cancel', { checkoutId }, now);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export function setLocalDnsMode(user: LocalUser, asciiLabel: string, mode: DnsMode): DemoPurchase {
  const db = database();
  const now = new Date().toISOString();
  ensureOwned(db, user, asciiLabel);
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('UPDATE domains SET dns_mode = ? WHERE ascii_label = ?').run(mode, asciiLabel);
    if (mode === 'HOSTED') db.prepare('DELETE FROM dns_records WHERE ascii_label = ?').run(asciiLabel);
    audit(db, user, asciiLabel, 'dns-mode', { mode }, now);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  return purchaseForUser(user, asciiLabel)!;
}

export function saveLocalDnsRecord(
  user: LocalUser,
  asciiLabel: string,
  input: LocalDnsRecordInput,
  recordId?: string,
): DemoPurchase {
  const db = database();
  const now = new Date().toISOString();
  ensureOwned(db, user, asciiLabel);
  const current = recordRows(asciiLabel);
  if (!recordId && current.length >= MAX_RECORDS_PER_DOMAIN) {
    throw new LocalDnsError(`1区画につき${MAX_RECORDS_PER_DOMAIN}件までです`);
  }
  if (recordId && !current.some((record) => record.id === recordId)) {
    throw new LocalDnsError('編集するレコードが見つかりません', 404);
  }
  const siblings = current.filter((record) => record.id !== recordId && record.fqdn === input.fqdn);
  if ((input.type === 'CNAME' && siblings.length > 0) || siblings.some((record) => record.type === 'CNAME')) {
    throw new LocalDnsError('CNAMEは同じホストの他レコードと共存できません', 409);
  }
  if (siblings.some((record) =>
    record.type === input.type && record.value === input.value && record.priority === input.priority)) {
    throw new LocalDnsError('同じDNSレコードがすでにあります', 409);
  }

  const id = recordId ?? `dns_${randomUUID()}`;
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare("UPDATE domains SET dns_mode = 'CUSTOM' WHERE ascii_label = ?").run(asciiLabel);
    if (recordId) {
      db.prepare(`
        UPDATE dns_records SET host = ?, fqdn = ?, type = ?, value = ?, priority = ?, updated_at = ?
        WHERE id = ? AND ascii_label = ?
      `).run(input.host, input.fqdn, input.type, input.value, input.priority, now, id, asciiLabel);
    } else {
      db.prepare(`
        INSERT INTO dns_records
          (id, ascii_label, host, fqdn, type, value, priority, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, asciiLabel, input.host, input.fqdn, input.type, input.value, input.priority, now, now);
    }
    audit(db, user, asciiLabel, recordId ? 'dns-record-update' : 'dns-record-create', { id, ...input }, now);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  return purchaseForUser(user, asciiLabel)!;
}

export function deleteLocalDnsRecord(user: LocalUser, asciiLabel: string, recordId: string): DemoPurchase {
  const db = database();
  const now = new Date().toISOString();
  ensureOwned(db, user, asciiLabel);
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = db.prepare('DELETE FROM dns_records WHERE id = ? AND ascii_label = ?').run(recordId, asciiLabel);
    if (Number(result.changes) === 0) throw new LocalDnsError('削除するレコードが見つかりません', 404);
    audit(db, user, asciiLabel, 'dns-record-delete', { recordId }, now);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  return purchaseForUser(user, asciiLabel)!;
}
