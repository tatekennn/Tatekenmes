import { VERCEL_PROJECT_ID, VERCEL_TEAM_ID } from './config';

const API = 'https://api.vercel.com';

function headers(): HeadersInit {
  const token = process.env.VERCEL_API_TOKEN;
  if (!token) throw new Error('VERCEL_API_TOKEN is not set');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

function qs(): string {
  return `teamId=${VERCEL_TEAM_ID}`;
}

/** プロジェクトに紐付くドメイン数（ハード上限の判定に使う） */
export async function countDomains(): Promise<number> {
  const res = await fetch(
    `${API}/v9/projects/${VERCEL_PROJECT_ID}/domains?${qs()}&limit=100`,
    { headers: headers() },
  );
  if (!res.ok) throw new Error(`vercel countDomains failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return Array.isArray(json?.domains) ? json.domains.length : 0;
}

/** そのドメインが既にプロジェクトに登録済みか */
export async function domainExists(name: string): Promise<boolean> {
  const res = await fetch(
    `${API}/v9/projects/${VERCEL_PROJECT_ID}/domains/${encodeURIComponent(name)}?${qs()}`,
    { headers: headers() },
  );
  return res.ok;
}

/** プロジェクトにドメインを追加（証明書は Vercel が自動発行）。409=既存は成功扱い。 */
export async function addDomain(name: string): Promise<void> {
  const res = await fetch(`${API}/v10/projects/${VERCEL_PROJECT_ID}/domains?${qs()}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ name }),
  });
  if (!res.ok && res.status !== 409) {
    throw new Error(`vercel addDomain failed: ${res.status} ${await res.text()}`);
  }
}
