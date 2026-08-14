import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { nameFromHost } from './lib/name';
import { BASE_ZONE_ASCII, DEMO_HOSTS } from './lib/config';

// たてけんは従来どおり専用ページ（xn--08j1av7a2n = たてけんの）
const TATEKEN_HOST = `xn--08j1av7a2n.${BASE_ZONE_ASCII}`;

export function middleware(request: NextRequest) {
  const host = (request.headers.get('host') ?? '').split(':')[0].toLowerCase();

  // apex（覇気.com）と www は素通し＝トップページ
  if (host === BASE_ZONE_ASCII || host === `www.${BASE_ZONE_ASCII}`) {
    return NextResponse.next();
  }

  // LT デモ用サブドメイン（shop / evil / alice / bob）
  // ローカルでは *.localhost:port で、本番では *.覇気.com で同じページに到達する。
  const label = host.endsWith(`.${BASE_ZONE_ASCII}`)
    ? host.slice(0, -`.${BASE_ZONE_ASCII}`.length)
    : host.endsWith('.localhost')
      ? host.slice(0, -'.localhost'.length)
      : null;
  if (label && DEMO_HOSTS[label]) {
    const url = request.nextUrl.clone();
    url.pathname = DEMO_HOSTS[label];
    return NextResponse.rewrite(url);
  }

  // たてけん専用ページ
  if (host === TATEKEN_HOST) {
    const url = request.nextUrl.clone();
    url.pathname = '/tateken';
    return NextResponse.rewrite(url);
  }

  // <name>の.覇気.com → /generated?name=<name>
  const name = nameFromHost(host);
  if (name) {
    const url = request.nextUrl.clone();
    url.pathname = '/generated';
    url.searchParams.set('name', name);
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/'],
};
