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
  assertCloudDomainOwned,
  cloudDnsRecordForUser,
  cloudPurchasesForUser,
  cloudUserForSession,
  CloudDbError,
  deleteCloudDnsRecord,
  markCloudDnsRecordSync,
  saveCloudDnsRecord,
  setCloudDnsMode,
  usingCloudDatabase,
} from '../../../../lib/cloud-db';
import { deleteMuuDnsRecord, syncMuuDnsMode, syncMuuDnsRecord } from '../../../../lib/dns-sync';
import { MuuApiError } from '../../../../lib/muu';

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
    const cloud = usingCloudDatabase();
    const publicDns = dnsProviderStatus().writesEnabled;
    if (action === 'set-mode') {
      if (!['HOSTED', 'CUSTOM'].includes(String(payload.mode))) {
        return NextResponse.json({ error: '接続方式が不正です' }, { status: 400 });
      }
      if (cloud) await assertCloudDomainOwned(user, asciiLabel);
      if (cloud && publicDns) await syncMuuDnsMode(asciiLabel, payload.mode as DnsMode);
      domain = cloud
        ? await setCloudDnsMode(user, asciiLabel, payload.mode as DnsMode)
        : setLocalDnsMode(user, asciiLabel, payload.mode as DnsMode);
    } else if (action === 'delete-record') {
      const recordId = typeof payload.recordId === 'string' ? payload.recordId : '';
      if (!recordId) return NextResponse.json({ error: 'DNSレコードが不正です' }, { status: 400 });
      if (cloud) {
        const record = await cloudDnsRecordForUser(user, asciiLabel, recordId);
        if (publicDns) await deleteMuuDnsRecord(record);
        domain = await deleteCloudDnsRecord(user, asciiLabel, recordId);
      } else {
        domain = deleteLocalDnsRecord(user, asciiLabel, recordId);
      }
    } else if (action === 'create-record' || action === 'update-record') {
      const parsed = validateDnsRecordInput(asciiLabel, payload);
      if (!parsed.ok) return NextResponse.json({ error: parsed.reason }, { status: 400 });
      const recordId = action === 'update-record' && typeof payload.recordId === 'string'
        ? payload.recordId
        : undefined;
      if (action === 'update-record' && !recordId) {
        return NextResponse.json({ error: '編集するDNSレコードが不正です' }, { status: 400 });
      }
      if (cloud) {
        const saved = await saveCloudDnsRecord(user, asciiLabel, parsed.record, recordId);
        if (publicDns) {
          try {
            const providerRecordId = await syncMuuDnsRecord(asciiLabel, saved.record, saved.previous);
            domain = await markCloudDnsRecordSync(user, asciiLabel, saved.record.id, {
              status: 'synced', providerRecordId,
            });
          } catch (error) {
            console.error('[api/local-sales/dns] public DNS sync failed', error);
            await markCloudDnsRecordSync(user, asciiLabel, saved.record.id, {
              status: 'failed',
              error: error instanceof Error ? error.message : 'unknown error',
              providerRecordId: saved.previous?.providerRecordId ?? null,
            });
            throw new CloudDbError('公開DNSへの同期に失敗しました。設定は未反映として保存されています。もう一度保存してください。', 502);
          }
        } else {
          domain = saved.domain;
        }
      } else {
        domain = saveLocalDnsRecord(user, asciiLabel, parsed.record, recordId);
      }
    } else {
      return NextResponse.json({ error: '操作が不正です' }, { status: 400 });
    }
    return NextResponse.json({ status: 'updated', domain, dnsProvider: dnsProviderStatus() });
  } catch (error) {
    if (error instanceof LocalDnsError || error instanceof CloudDbError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof MuuApiError) {
      console.error('[api/local-sales/dns] Muu API failed', error);
      return NextResponse.json({ error: 'ムームーDNSへの反映に失敗しました。時間をおいて再試行してください。' }, { status: 502 });
    }
    console.error('[api/local-sales/dns]', error);
    return NextResponse.json({ error: 'DNS設定の保存に失敗しました' }, { status: 500 });
  }
}
