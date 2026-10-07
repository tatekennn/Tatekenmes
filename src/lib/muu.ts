import { MUU_API_BASE, MUU_DOMAIN_ID, VERCEL_A_IP } from './config';
import type { DnsRecordType } from './subdomain-sale';

// ムームードメイン API v2（Me API）。PAT を Bearer で使う。
// スコープは「DNS操作(dns:write)」のみ想定＝ドメイン購入等の課金操作は行えない。

function headers(): HeadersInit {
  const token = process.env.MUU_API_TOKEN;
  if (!token) throw new Error('MUU_API_TOKEN is not set');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'User-Agent': 'tatekenmes/1.0 (+https://xn--7qwx14d.com)',
  };
}

function withDot(fqdn: string): string {
  return fqdn.endsWith('.') ? fqdn : `${fqdn}.`;
}

export type MuuDnsRecord = {
  id: number;
  fqdn: string;
  type: string;
  value: string;
  priority?: number | null;
  ttl?: number;
};

export class MuuApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function jsonResponse<T>(res: Response, action: string): Promise<T> {
  const body = await res.text();
  if (!res.ok) {
    throw new MuuApiError(`muu ${action} failed: ${res.status} ${body.slice(0, 500)}`, res.status);
  }
  try {
    return JSON.parse(body) as T;
  } catch {
    throw new MuuApiError(`muu ${action} returned invalid JSON`, 502);
  }
}

function apiValue(type: DnsRecordType, value: string) {
  return type === 'CNAME' || type === 'MX' ? withDot(value) : value;
}

/** 既存レコードを取得（fqdn省略時はゾーン全件） */
export async function listRecords(fqdn?: string): Promise<MuuDnsRecord[]> {
  const base = `${MUU_API_BASE}/me/domains/${MUU_DOMAIN_ID}/dns-records`;
  const records: MuuDnsRecord[] = [];
  for (let page = 1; page <= 2; page += 1) {
    const params = new URLSearchParams({ page: String(page), 'page-size': '100' });
    if (fqdn) params.set('fqdn', withDot(fqdn));
    const res = await fetch(`${base}?${params}`, { headers: headers(), cache: 'no-store' });
    const json = await jsonResponse<{ data?: MuuDnsRecord[]; meta?: { total?: number } }>(res, 'listRecords');
    records.push(...(json.data ?? []));
    if (records.length >= Number(json.meta?.total ?? records.length)) break;
  }
  return records;
}

/** レコードを1件作成する */
export async function createRecord(
  fqdn: string,
  type: DnsRecordType,
  value: string,
  priority: number | null = null,
): Promise<MuuDnsRecord> {
  const body: Record<string, unknown> = {
    fqdn: withDot(fqdn),
    type,
    value: apiValue(type, value),
  };
  if (type === 'MX') body.priority = priority;
  const res = await fetch(`${MUU_API_BASE}/me/domains/${MUU_DOMAIN_ID}/dns-records`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });
  const json = await jsonResponse<{ data: MuuDnsRecord }>(res, 'createRecord');
  return json.data;
}

export async function updateRecord(
  id: string | number,
  type: DnsRecordType,
  value: string,
  priority: number | null = null,
): Promise<MuuDnsRecord> {
  const body: Record<string, unknown> = { value: apiValue(type, value) };
  if (type === 'MX') body.priority = priority;
  const res = await fetch(`${MUU_API_BASE}/me/domains/${MUU_DOMAIN_ID}/dns-records/${id}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(body),
  });
  const json = await jsonResponse<{ data: MuuDnsRecord }>(res, 'updateRecord');
  return json.data;
}

export async function deleteRecord(id: string | number): Promise<void> {
  const res = await fetch(`${MUU_API_BASE}/me/domains/${MUU_DOMAIN_ID}/dns-records/${id}`, {
    method: 'DELETE',
    headers: headers(),
  });
  if (!res.ok && res.status !== 404) {
    throw new MuuApiError(`muu deleteRecord failed: ${res.status} ${(await res.text()).slice(0, 500)}`, res.status);
  }
}

/** その FQDN に既に何かレコードがあるか（＝売約済み判定） */
export async function hasAnyRecord(fqdn: string): Promise<boolean> {
  return (await listRecords(fqdn)).length > 0;
}

/** 分譲済み区画数（apex・www・アンダースコア札を除いた、ゾーン内のユニークなサブドメイン数）。
 * 持ち込みプランは Vercel にドメインが増えないため、上限判定は DNS 側で数える。 */
export async function countSubdomainNames(zoneAscii: string): Promise<number> {
  const records = await listRecords();
  const names = new Set<string>();
  for (const r of records) {
    const f = r.fqdn.toLowerCase().replace(/\.$/, '');
    if (f === zoneAscii || f === `www.${zoneAscii}`) continue;
    if (f.startsWith('_')) continue; // _for-sale 等の運用札
    if (f.endsWith(`.${zoneAscii}`)) names.add(f);
  }
  return names.size;
}

/** Vercel を指す A レコードを作成（既存があれば作成しない） */
export async function ensureARecord(fqdn: string): Promise<{ created: boolean }> {
  const existing = await listRecords(fqdn);
  if (existing.some((r) => r.type === 'A')) return { created: false };
  await createRecord(fqdn, 'A', VERCEL_A_IP);
  return { created: true };
}
