import { NextRequest, NextResponse } from 'next/server';
import { validateSubdomain } from '../../../lib/subdomain-sale';
import {
  createLocalFreeClaim,
  isLocalLabelUnavailable,
  LOCAL_SESSION_COOKIE,
  localStock,
  localUserForSession,
} from '../../../lib/local-db';
import {
  claimCloudDomain,
  cloudLabelUnavailable,
  cloudPurchasesForUser,
  cloudStock,
  cloudUserForSession,
  usingCloudDatabase,
} from '../../../lib/cloud-db';
import { ensureARecord } from '../../../lib/muu';
import { addDomain } from '../../../lib/vercel';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const stock = usingCloudDatabase() ? await cloudStock() : localStock();
  return NextResponse.json({ mode: usingCloudDatabase() ? 'cloud-free' : 'local-free', ...stock });
}

export async function POST(req: NextRequest) {
  let payload: { action?: unknown; label?: unknown };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'リクエストが不正です' }, { status: 400 });
  }

  const validation = validateSubdomain(payload.label);
  if (!validation.ok) {
    return NextResponse.json({ available: false, error: validation.reason }, { status: 400 });
  }
  const unavailable = usingCloudDatabase()
    ? await cloudLabelUnavailable(validation.asciiLabel)
    : isLocalLabelUnavailable(validation.asciiLabel);
  if (unavailable) {
    return NextResponse.json({ available: false, error: `${validation.displayDomain} は取得済みです` }, { status: 409 });
  }

  if (payload.action === 'check') {
    const stock = usingCloudDatabase() ? await cloudStock() : localStock();
    return NextResponse.json({ available: true, label: validation.label, domain: validation.displayDomain, ...stock });
  }
  if (payload.action !== 'claim') {
    return NextResponse.json({ error: '操作が不正です' }, { status: 400 });
  }

  const token = req.cookies.get(LOCAL_SESSION_COOKIE)?.value;
  const user = usingCloudDatabase() ? await cloudUserForSession(token) : localUserForSession(token);
  if (!user) return NextResponse.json({ error: '取得前にログインしてください' }, { status: 401 });
  if (usingCloudDatabase() && (await cloudPurchasesForUser(user.id)).length > 0) {
    return NextResponse.json({ error: '無料取得は1アカウントにつき1区画までです' }, { status: 409 });
  }
  const stock = usingCloudDatabase() ? await cloudStock() : localStock();
  if (stock.remaining <= 0) return NextResponse.json({ error: '現在空きがありません' }, { status: 409 });

  try {
    if (usingCloudDatabase()) {
      await ensureARecord(validation.fqdn);
      await addDomain(validation.fqdn);
    }
    const claim = usingCloudDatabase()
      ? await claimCloudDomain(validation, user)
      : createLocalFreeClaim(validation, user);
    const updatedStock = usingCloudDatabase() ? await cloudStock() : localStock();
    return NextResponse.json({
      status: 'free-claimed',
      orderId: claim.orderId,
      domain: claim.displayDomain,
      previewUrl: `/generated?name=${encodeURIComponent(claim.label)}`,
      ...updatedStock,
    });
  } catch (error) {
    const status = error instanceof Error && 'status' in error && typeof error.status === 'number' ? error.status : 500;
    const message = status < 500 && error instanceof Error ? error.message : '無料取得の保存に失敗しました';
    return NextResponse.json({ error: message }, { status });
  }
}
