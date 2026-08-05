import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// たてけんの.覇気.com（ブラウザは punycode の A-label で Host を送るため両方を許容）
const TATEKEN_HOSTS = new Set([
  'xn--08j1av7a2n.xn--7qwx14d.com',
  'たてけんの.覇気.com',
]);

export function middleware(request: NextRequest) {
  const host = (request.headers.get('host') ?? '').split(':')[0].toLowerCase();

  // サブドメインのルートアクセスのみ /tateken を表示する（他パスは素通し）
  if (TATEKEN_HOSTS.has(host)) {
    const url = request.nextUrl.clone();
    url.pathname = '/tateken';
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/'],
};
