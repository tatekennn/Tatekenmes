import { NextResponse } from 'next/server';
import { MAX_SUBDOMAINS, BASE_ZONE_ASCII } from '../../../lib/config';
import { countSubdomainNames } from '../../../lib/muu';

export const runtime = 'nodejs';

// 分譲状況。muu API への負荷を抑えるためインスタンス内で60秒キャッシュ。
let cache: { at: number; sold: number } | null = null;

export async function GET() {
  try {
    if (!cache || Date.now() - cache.at > 60_000) {
      cache = { at: Date.now(), sold: await countSubdomainNames(BASE_ZONE_ASCII) };
    }
    const remaining = Math.max(0, MAX_SUBDOMAINS - cache.sold);
    return NextResponse.json({ total: MAX_SUBDOMAINS, sold: cache.sold, remaining });
  } catch {
    return NextResponse.json({ total: MAX_SUBDOMAINS, sold: null, remaining: null });
  }
}
