import { NextResponse } from 'next/server';
import { validateName, fqdnFor } from '../../../lib/name';
import { parseTarget } from '../../../lib/target';
import { MAX_SUBDOMAINS, SUFFIX, BASE_ZONE_ASCII } from '../../../lib/config';
import { ensureARecord, createRecord, hasAnyRecord, countSubdomainNames } from '../../../lib/muu';
import { addDomain, domainExists } from '../../../lib/vercel';

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

  const { name: nameInput, target: targetInput } = (payload ?? {}) as {
    name?: unknown;
    target?: unknown;
  };

  const v = validateName(nameInput);
  if (!v.ok) return NextResponse.json({ error: v.reason }, { status: 400 });

  // 持ち込みプラン（自分のサーバーへ向ける）か、入居プラン（覇気ページ）か
  const byo = typeof targetInput === 'string' && targetInput.trim() !== '';
  const parsed = byo ? parseTarget(targetInput) : null;
  if (parsed && !parsed.ok) {
    return NextResponse.json({ error: parsed.reason }, { status: 400 });
  }

  const fqdn = fqdnFor(v.name); // xn--….xn--7qwx14d.com
  const displayDomain = `${v.name}${SUFFIX}.覇気.com`;
  const url = `https://${displayDomain}`;

  try {
    // 売約済み判定（DNS と Vercel の両方を見る）
    if (await hasAnyRecord(fqdn)) {
      if (byo) {
        return NextResponse.json(
          { error: `${displayDomain} は売約済みです`, status: 'sold-out' },
          { status: 409 },
        );
      }
      return NextResponse.json({ status: 'exists', name: v.name, url });
    }
    if (await domainExists(fqdn)) {
      return NextResponse.json({ status: 'exists', name: v.name, url });
    }

    // 分譲区画のハード上限（コスト・証明書レート制限の暴走対策）
    const sold = await countSubdomainNames(BASE_ZONE_ASCII);
    if (sold >= MAX_SUBDOMAINS) {
      return NextResponse.json(
        { error: '全区画が分譲済みです。空きをお待ちください', status: 'sold-out' },
        { status: 503 },
      );
    }

    if (parsed && parsed.ok) {
      // 持ち込みプラン：買い手の向き先へレコードを作るだけ。
      // ホスティングも証明書も買い手の責任範囲（うちは DNS の大家さん）。
      await createRecord(fqdn, parsed.target.kind, parsed.target.value);
      return NextResponse.json({
        status: 'sold',
        name: v.name,
        domain: displayDomain,
        record: { type: parsed.target.kind, value: parsed.target.value },
        note: 'DNSレコードを設定しました。HTTPS証明書は向き先サーバー側でご用意ください',
      });
    }

    // 入居プラン：① muu API で Vercel を指す A レコード → ② Vercel にドメイン追加
    await ensureARecord(fqdn);
    await addDomain(fqdn);
    return NextResponse.json({ status: 'provisioning', name: v.name, url });
  } catch (err) {
    console.error('[api/create]', err);
    return NextResponse.json(
      { error: '手続きに失敗しました。時間をおいて再度お試しください' },
      { status: 502 },
    );
  }
}
