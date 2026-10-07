import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import type { LocalDnsRecordInput, LocalUser } from './local-db';
import type { DemoDnsRecord, DemoPurchase, DnsMode, SubdomainValidation } from './subdomain-sale';
import { MAX_SUBDOMAINS } from './config';

const PRODUCTION_SOLD_SNAPSHOT = 12;
const MAX_RECORDS_PER_DOMAIN = 25;
let schemaReady: Promise<void> | null = null;

export class CloudDbError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  return neon(url);
}

export function usingCloudDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const db = sql();
      await db`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_salt TEXT NOT NULL,
        password_hash TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL
      )`;
      await db`CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL
      )`;
      await db`CREATE TABLE IF NOT EXISTS domains (
        ascii_label TEXT PRIMARY KEY, display_domain TEXT NOT NULL, label TEXT NOT NULL,
        user_id TEXT NOT NULL REFERENCES users(id), order_id TEXT NOT NULL UNIQUE,
        dns_mode TEXT NOT NULL DEFAULT 'HOSTED', created_at TIMESTAMPTZ NOT NULL
      )`;
      await db`CREATE TABLE IF NOT EXISTS dns_records (
        id TEXT PRIMARY KEY, ascii_label TEXT NOT NULL REFERENCES domains(ascii_label) ON DELETE CASCADE,
        host TEXT NOT NULL, fqdn TEXT NOT NULL, type TEXT NOT NULL, value TEXT NOT NULL,
        priority INTEGER, provider_record_id TEXT, sync_status TEXT NOT NULL DEFAULT 'pending',
        sync_error TEXT, synced_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
      )`;
      await db`ALTER TABLE dns_records ADD COLUMN IF NOT EXISTS provider_record_id TEXT`;
      await db`ALTER TABLE dns_records ADD COLUMN IF NOT EXISTS sync_status TEXT NOT NULL DEFAULT 'pending'`;
      await db`ALTER TABLE dns_records ADD COLUMN IF NOT EXISTS sync_error TEXT`;
      await db`ALTER TABLE dns_records ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ`;
      await db`CREATE INDEX IF NOT EXISTS dns_records_domain_idx ON dns_records(ascii_label)`;
      await db`CREATE TABLE IF NOT EXISTS audit_logs (
        id BIGSERIAL PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), ascii_label TEXT NOT NULL,
        action TEXT NOT NULL, detail JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL
      )`;
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}

function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function passwordDigest(password: string, salt: string) {
  return scryptSync(password, salt, 64);
}

async function issueSession(user: LocalUser) {
  await ensureSchema();
  const db = sql();
  const token = `session_${randomUUID()}_${randomUUID()}`;
  const now = new Date();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db`INSERT INTO sessions (token_hash, user_id, expires_at, created_at)
    VALUES (${tokenHash(token)}, ${user.id}, ${expiresAt.toISOString()}, ${now.toISOString()})`;
  return { token, user };
}

export async function createCloudAccount(emailInput: string, password: string) {
  await ensureSchema();
  const db = sql();
  const email = emailInput.trim().toLowerCase();
  const existing = await db`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
  if (existing.length) throw new CloudDbError('このメールアドレスは登録済みです', 409);
  const user = { id: `usr_${randomUUID()}`, email };
  const salt = randomBytes(16).toString('hex');
  const hash = passwordDigest(password, salt).toString('hex');
  await db`INSERT INTO users (id, email, password_salt, password_hash, created_at)
    VALUES (${user.id}, ${email}, ${salt}, ${hash}, ${new Date().toISOString()})`;
  return issueSession(user);
}

export async function authenticateCloudAccount(emailInput: string, password: string) {
  await ensureSchema();
  const db = sql();
  const email = emailInput.trim().toLowerCase();
  const rows = await db`SELECT id, email, password_salt, password_hash FROM users WHERE email = ${email} LIMIT 1`;
  const row = rows[0] as { id: string; email: string; password_salt: string; password_hash: string } | undefined;
  if (!row) throw new CloudDbError('メールアドレスまたはパスワードが違います', 401);
  const actual = passwordDigest(password, row.password_salt);
  const expected = Buffer.from(row.password_hash, 'hex');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new CloudDbError('メールアドレスまたはパスワードが違います', 401);
  }
  return issueSession({ id: row.id, email: row.email });
}

export async function cloudUserForSession(token: string | undefined): Promise<LocalUser | null> {
  if (!token) return null;
  await ensureSchema();
  const db = sql();
  const rows = await db`SELECT users.id, users.email FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ${tokenHash(token)} AND sessions.expires_at > NOW() LIMIT 1`;
  return (rows[0] as LocalUser | undefined) ?? null;
}

export async function deleteCloudSession(token: string | undefined) {
  if (!token) return;
  await ensureSchema();
  await sql()`DELETE FROM sessions WHERE token_hash = ${tokenHash(token)}`;
}

export async function cloudLabelUnavailable(asciiLabel: string) {
  await ensureSchema();
  const rows = await sql()`SELECT 1 FROM domains WHERE ascii_label = ${asciiLabel} LIMIT 1`;
  return rows.length > 0;
}

export async function cloudStock() {
  await ensureSchema();
  const rows = await sql()`SELECT COUNT(*)::int AS count FROM domains`;
  const sold = Math.min(MAX_SUBDOMAINS, PRODUCTION_SOLD_SNAPSHOT + Number(rows[0]?.count ?? 0));
  return { total: MAX_SUBDOMAINS, sold, remaining: Math.max(0, MAX_SUBDOMAINS - sold) };
}

async function audit(user: LocalUser, asciiLabel: string, action: string, detail: unknown) {
  await sql()`INSERT INTO audit_logs (user_id, ascii_label, action, detail, created_at)
    VALUES (${user.id}, ${asciiLabel}, ${action}, ${JSON.stringify(detail)}, ${new Date().toISOString()})`;
}

export async function claimCloudDomain(
  validation: Extract<SubdomainValidation, { ok: true }>,
  user: LocalUser,
): Promise<DemoPurchase> {
  await ensureSchema();
  const db = sql();
  const owned = await db`SELECT 1 FROM domains WHERE user_id = ${user.id} LIMIT 1`;
  if (owned.length) throw new CloudDbError('無料取得は1アカウントにつき1区画までです', 409);
  const orderId = `free_${Date.now().toString(36)}_${randomUUID().slice(0, 8)}`;
  try {
    await db`INSERT INTO domains
      (ascii_label, display_domain, label, user_id, order_id, dns_mode, created_at)
      VALUES (${validation.asciiLabel}, ${validation.displayDomain}, ${validation.label}, ${user.id},
        ${orderId}, 'HOSTED', ${new Date().toISOString()})`;
  } catch (error) {
    if (error instanceof Error && error.message.includes('unique')) {
      throw new CloudDbError(`${validation.displayDomain} は取得済みです`, 409);
    }
    throw error;
  }
  await audit(user, validation.asciiLabel, 'free-claim', { orderId });
  return (await cloudPurchasesForUser(user.id))[0];
}

type DomainRow = {
  ascii_label: string; display_domain: string; label: string; email: string;
  order_id: string; created_at: string; dns_mode: DnsMode;
};

export async function cloudPurchasesForUser(userId: string): Promise<DemoPurchase[]> {
  await ensureSchema();
  const db = sql();
  const rows = await db`SELECT domains.ascii_label, domains.display_domain, domains.label,
    users.email, domains.order_id, domains.created_at, domains.dns_mode
    FROM domains JOIN users ON users.id = domains.user_id
    WHERE domains.user_id = ${userId} ORDER BY domains.created_at DESC` as DomainRow[];
  const purchases: DemoPurchase[] = [];
  for (const row of rows) {
    const recordRows = await db`SELECT id, host, fqdn, type, value, priority, updated_at,
      provider_record_id, sync_status, sync_error
      FROM dns_records WHERE ascii_label = ${row.ascii_label} ORDER BY host, type, created_at`;
    purchases.push({
      asciiLabel: row.ascii_label,
      displayDomain: row.display_domain,
      label: row.label,
      email: row.email,
      orderId: row.order_id,
      createdAt: String(row.created_at),
      dnsMode: row.dns_mode,
      records: recordRows.map((record) => ({
        id: String(record.id), host: String(record.host), fqdn: String(record.fqdn),
        type: record.type as DemoDnsRecord['type'], value: String(record.value),
        priority: record.priority === null ? null : Number(record.priority), updatedAt: String(record.updated_at),
        providerRecordId: record.provider_record_id === null ? null : String(record.provider_record_id),
        syncStatus: String(record.sync_status) as DemoDnsRecord['syncStatus'],
        syncError: record.sync_error === null ? null : String(record.sync_error),
      })),
    });
  }
  return purchases;
}

async function ensureOwned(user: LocalUser, asciiLabel: string) {
  const rows = await sql()`SELECT 1 FROM domains WHERE ascii_label = ${asciiLabel} AND user_id = ${user.id} LIMIT 1`;
  if (!rows.length) throw new CloudDbError('このドメインを変更する権限がありません', 403);
}

export async function assertCloudDomainOwned(user: LocalUser, asciiLabel: string) {
  await ensureSchema();
  await ensureOwned(user, asciiLabel);
}

async function cloudPurchase(user: LocalUser, asciiLabel: string) {
  return (await cloudPurchasesForUser(user.id)).find((item) => item.asciiLabel === asciiLabel)!;
}

export async function setCloudDnsMode(user: LocalUser, asciiLabel: string, mode: DnsMode) {
  await ensureSchema();
  await ensureOwned(user, asciiLabel);
  const db = sql();
  await db`UPDATE domains SET dns_mode = ${mode} WHERE ascii_label = ${asciiLabel}`;
  if (mode === 'HOSTED') await db`DELETE FROM dns_records WHERE ascii_label = ${asciiLabel}`;
  await audit(user, asciiLabel, 'dns-mode', { mode });
  return cloudPurchase(user, asciiLabel);
}

export async function saveCloudDnsRecord(
  user: LocalUser,
  asciiLabel: string,
  input: LocalDnsRecordInput,
  recordId?: string,
) {
  await ensureSchema();
  await ensureOwned(user, asciiLabel);
  const db = sql();
  const current = (await cloudPurchase(user, asciiLabel)).records;
  const previous = recordId ? current.find((record) => record.id === recordId) : undefined;
  if (!recordId && current.length >= MAX_RECORDS_PER_DOMAIN) throw new CloudDbError('DNSレコード数が上限です');
  if (recordId && !current.some((record) => record.id === recordId)) throw new CloudDbError('編集するレコードが見つかりません', 404);
  const siblings = current.filter((record) => record.id !== recordId && record.fqdn === input.fqdn);
  if ((input.type === 'CNAME' && siblings.length) || siblings.some((record) => record.type === 'CNAME')) {
    throw new CloudDbError('CNAMEは同じホストの他レコードと共存できません', 409);
  }
  const now = new Date().toISOString();
  const savedId = recordId ?? `dns_${randomUUID()}`;
  await db`UPDATE domains SET dns_mode = 'CUSTOM' WHERE ascii_label = ${asciiLabel}`;
  if (recordId) {
    await db`UPDATE dns_records SET host = ${input.host}, fqdn = ${input.fqdn}, type = ${input.type},
      value = ${input.value}, priority = ${input.priority}, sync_status = 'pending', sync_error = NULL,
      updated_at = ${now}
      WHERE id = ${recordId} AND ascii_label = ${asciiLabel}`;
  } else {
    await db`INSERT INTO dns_records
      (id, ascii_label, host, fqdn, type, value, priority, provider_record_id, sync_status, created_at, updated_at)
      VALUES (${savedId}, ${asciiLabel}, ${input.host}, ${input.fqdn}, ${input.type},
        ${input.value}, ${input.priority}, NULL, 'pending', ${now}, ${now})`;
  }
  await audit(user, asciiLabel, recordId ? 'dns-record-update' : 'dns-record-create', input);
  const domain = await cloudPurchase(user, asciiLabel);
  return { domain, record: domain.records.find((record) => record.id === savedId)!, previous };
}

export async function markCloudDnsRecordSync(
  user: LocalUser,
  asciiLabel: string,
  recordId: string,
  result: { status: 'synced'; providerRecordId: string } | { status: 'failed'; error: string; providerRecordId?: string | null },
) {
  await ensureSchema();
  await ensureOwned(user, asciiLabel);
  const db = sql();
  if (result.status === 'synced') {
    await db`UPDATE dns_records SET provider_record_id = ${result.providerRecordId}, sync_status = 'synced',
      sync_error = NULL, synced_at = ${new Date().toISOString()} WHERE id = ${recordId} AND ascii_label = ${asciiLabel}`;
  } else {
    const providerRecordId = result.providerRecordId === undefined ? null : result.providerRecordId;
    await db`UPDATE dns_records SET provider_record_id = ${providerRecordId}, sync_status = 'failed',
      sync_error = ${result.error.slice(0, 500)} WHERE id = ${recordId} AND ascii_label = ${asciiLabel}`;
  }
  return cloudPurchase(user, asciiLabel);
}

export async function cloudDnsRecordForUser(user: LocalUser, asciiLabel: string, recordId: string) {
  await ensureSchema();
  await ensureOwned(user, asciiLabel);
  const record = (await cloudPurchase(user, asciiLabel)).records.find((item) => item.id === recordId);
  if (!record) throw new CloudDbError('DNSレコードが見つかりません', 404);
  return record;
}

export async function deleteCloudDnsRecord(user: LocalUser, asciiLabel: string, recordId: string) {
  await ensureSchema();
  await ensureOwned(user, asciiLabel);
  const rows = await sql()`DELETE FROM dns_records WHERE id = ${recordId} AND ascii_label = ${asciiLabel} RETURNING id`;
  if (!rows.length) throw new CloudDbError('削除するレコードが見つかりません', 404);
  await audit(user, asciiLabel, 'dns-record-delete', { recordId });
  return cloudPurchase(user, asciiLabel);
}
