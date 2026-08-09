import { MUU_API_BASE, MUU_DOMAIN_ID, VERCEL_A_IP } from './config';

// ムームードメイン API v2（Me API）。PAT を Bearer で使う。
// スコープは「DNS操作(dns:write)」のみ想定＝ドメイン購入等の課金操作は行えない。

function headers(): HeadersInit {
  const token = process.env.MUU_API_TOKEN;
  if (!token) throw new Error('MUU_API_TOKEN is not set');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

function withDot(fqdn: string): string {
  return fqdn.endsWith('.') ? fqdn : `${fqdn}.`;
}

type DnsRecord = { id: number; fqdn: string; type: string; value: string };

/** 指定 FQDN の既存レコードを取得 */
export async function listRecords(fqdn: string): Promise<DnsRecord[]> {
  const url = `${MUU_API_BASE}/me/domains/${MUU_DOMAIN_ID}/dns-records?fqdn=${encodeURIComponent(
    withDot(fqdn),
  )}`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`muu listRecords failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return (json?.data ?? []) as DnsRecord[];
}

/** Vercel を指す A レコードを作成（既存があれば作成しない） */
export async function ensureARecord(fqdn: string): Promise<{ created: boolean }> {
  const existing = await listRecords(fqdn);
  if (existing.some((r) => r.type === 'A')) return { created: false };

  const res = await fetch(`${MUU_API_BASE}/me/domains/${MUU_DOMAIN_ID}/dns-records`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ fqdn: withDot(fqdn), type: 'A', value: VERCEL_A_IP }),
  });
  if (!res.ok) throw new Error(`muu createRecord failed: ${res.status} ${await res.text()}`);
  return { created: true };
}
