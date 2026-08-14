import { MUU_API_BASE, MUU_DOMAIN_ID, VERCEL_A_IP } from './config';

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

type DnsRecord = { id: number; fqdn: string; type: string; value: string };

/** 既存レコードを取得（fqdn省略時はゾーン全件） */
export async function listRecords(fqdn?: string): Promise<DnsRecord[]> {
  const base = `${MUU_API_BASE}/me/domains/${MUU_DOMAIN_ID}/dns-records`;
  const url = fqdn ? `${base}?fqdn=${encodeURIComponent(withDot(fqdn))}` : base;
  const res = await fetch(url, { headers: headers() });
  const ct = res.headers.get('content-type') ?? '';
  if (!res.ok || !ct.includes('json')) {
    throw new Error(
      `muu listRecords failed: status=${res.status} finalUrl=${res.url} ct=${ct} body=${(await res.text()).slice(0, 120)}`,
    );
  }
  const json = await res.json();
  return (json?.data ?? []) as DnsRecord[];
}

/** レコードを1件作成する */
export async function createRecord(
  fqdn: string,
  type: 'A' | 'CNAME',
  value: string,
): Promise<void> {
  const res = await fetch(`${MUU_API_BASE}/me/domains/${MUU_DOMAIN_ID}/dns-records`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      fqdn: withDot(fqdn),
      type,
      // CNAME の値は FQDN なので末尾ドット必須（無いとゾーン相対名と解釈される）
      value: type === 'CNAME' ? withDot(value) : value,
    }),
  });
  if (!res.ok) throw new Error(`muu createRecord failed: ${res.status} ${await res.text()}`);
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
