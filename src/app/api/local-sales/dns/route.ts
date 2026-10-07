import { NextRequest, NextResponse } from 'next/server';
import { validateDnsRecordInput } from '../../../../lib/dns-record';
import {
  deleteLocalDnsRecord,
  LOCAL_SESSION_COOKIE,
  LocalDnsError,
  localPurchasesForUser,
  localUserForSession,
  saveLocalDnsRecord,
  setLocalDnsMode,
} from '../../../../lib/local-db';
import type { DnsMode } from '../../../../lib/subdomain-sale';
import { dnsProviderStatus } from '../../../../lib/dns-provider';
import {
  cloudPurchasesForUser,
  cloudUserForSession,
  deleteCloudDnsRecord,
  saveCloudDnsRecord,
  setCloudDnsMode,
  usingCloudDatabase,
} from '../../../../lib/cloud-db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function currentUser(req: NextRequest) {
  const token = req.cookies.get(LOCAL_SESSION_COOKIE)?.value;
  return usingCloudDatabase() ? cloudUserForSession(token) : localUserForSession(token);
}

export async function GET(req: NextRequest) {
  const user = await currentUser(req);
  if (!user) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
  const domains = usingCloudDatabase() ? await cloudPurchasesForUser(user.id) : localPurchasesForUser(user.id);
  return NextResponse.json({ user, domains, dnsProvider: dnsProviderStatus() });
}

export async function POST(req: NextRequest) {
  const user = await currentUser(req);
  if (!user) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });

  let payload: {
    action?: unknown;
    asciiLabel?: unknown;
    mode?: unknown;
    recordId?: unknown;
    host?: unknown;
    type?: unknown;
    value?: unknown;
    priority?: unknown;
  };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'リクエストが不正です' }, { status: 400 });
  }

  const asciiLabel = typeof payload.asciiLabel === 'string' ? payload.asciiLabel : '';
  const action = typeof payload.action === 'string' ? payload.action : '';
  if (!asciiLabel) return NextResponse.json({ error: '対象ドメインが不正です' }, { status: 400 });

  try {
    let domain;
    if (action === 'set-mode') {
      if (!['HOSTED', 'CUSTOM'].includes(String(payload.mode))) {
        return NextResponse.json({ error: '接続方式が不正です' }, { status: 400 });
      }
      domain = usingCloudDatabase()
        ? await setCloudDnsMode(user, asciiLabel, payload.mode as DnsMode)
        : setLocalDnsMode(user, asciiLabel, payload.mode as DnsMode);
    } else if (action === 'delete-record') {
      const recordId = typeof payload.recordId === 'string' ? payload.recordId : '';
      if (!recordId) return NextResponse.json({ error: 'DNSレコードが不正です' }, { status: 400 });
      domain = usingCloudDatabase()
        ? await deleteCloudDnsRecord(user, asciiLabel, recordId)
        : deleteLocalDnsRecord(user, asciiLabel, recordId);
    } else if (action === 'create-record' || action === 'update-record') {
      const parsed = validateDnsRecordInput(asciiLabel, payload);
      if (!parsed.ok) return NextResponse.json({ error: parsed.reason }, { status: 400 });
      const recordId = action === 'update-record' && typeof payload.recordId === 'string'
        ? payload.recordId
        : undefined;
      if (action === 'update-record' && !recordId) {
        return NextResponse.json({ error: '編集するDNSレコードが不正です' }, { status: 400 });
      }
      domain = usingCloudDatabase()
        ? await saveCloudDnsRecord(user, asciiLabel, parsed.record, recordId)
        : saveLocalDnsRecord(user, asciiLabel, parsed.record, recordId);
    } else {
      return NextResponse.json({ error: '操作が不正です' }, { status: 400 });
    }
    return NextResponse.json({ status: 'updated', domain, dnsProvider: dnsProviderStatus() });
  } catch (error) {
    if (error instanceof LocalDnsError || (error instanceof Error && 'status' in error && typeof error.status === 'number')) {
      const status = Number(error.status);
      return NextResponse.json({ error: error.message }, { status });
    }
    console.error('[api/local-sales/dns]', error);
    return NextResponse.json({ error: 'ローカルDBへの保存に失敗しました' }, { status: 500 });
  }
}
