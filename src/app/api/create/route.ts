import { NextResponse } from 'next/server';
import { validateName, fqdnFor } from '../../../lib/name';
import { MAX_SUBDOMAINS, SUFFIX } from '../../../lib/config';
import { ensureARecord } from '../../../lib/muu';
import { addDomain, countDomains, domainExists } from '../../../lib/vercel';

export const runtime = 'nodejs';

// 簡易レート制限（ベストエフォート：インスタンス内メモリ）。
// 本命の暴走対策は MAX_SUBDOMAINS のハード上限。
const hits = new Map<string, number[]>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const WINDOW = 60_000;
  const MAX = 5;
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > MAX;
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (rateLimited(ip)) {
    return NextResponse.json({ error: '少し時間を置いてから試してください' }, { status: 429 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'リクエストが不正です' }, { status: 400 });
  }

  const nameInput = (payload as { name?: unknown })?.name;
  const v = validateName(nameInput);
  if (!v.ok) return NextResponse.json({ error: v.reason }, { status: 400 });

  const fqdn = fqdnFor(v.name); // xn--….xn--7qwx14d.com
  const url = `https://${v.name}${SUFFIX}.覇気.com`; // 表示用（人間が読める形）

  try {
    // 既に存在するなら冪等に返す（作り直さない）
    if (await domainExists(fqdn)) {
      return NextResponse.json({ status: 'exists', name: v.name, url });
    }

    // ハード上限（コスト・Vercel/証明書レート制限の暴走対策）
    if ((await countDomains()) >= MAX_SUBDOMAINS) {
      return NextResponse.json(
        { error: '現在受付上限に達しています。しばらくお待ちください' },
        { status: 503 },
      );
    }

    // ① muu API：Vercel を指す A レコードを作成
    await ensureARecord(fqdn);
    // ② Vercel API：ドメインを追加（証明書は自動発行）
    await addDomain(fqdn);

    return NextResponse.json({ status: 'provisioning', name: v.name, url });
  } catch (err) {
    console.error('[api/create]', err);
    return NextResponse.json(
      { error: '生成に失敗しました。時間をおいて再度お試しください' },
      { status: 502 },
    );
  }
}
