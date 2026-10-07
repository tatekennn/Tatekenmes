import { isIP } from 'node:net';
import { BASE_ZONE_ASCII } from './config';
import { parseTarget } from './target';
import type { DnsRecordType } from './subdomain-sale';
import type { LocalDnsRecordInput } from './local-db';

const TYPES = new Set<DnsRecordType>(['A', 'AAAA', 'CNAME', 'TXT', 'MX', 'CAA']);
const HOST_LABEL_RE = /^_?[a-z0-9](?:[a-z0-9_-]{0,61}[a-z0-9_])?$/;
const TARGET_RE = /^(?=.{1,253}$)([a-z0-9_]([a-z0-9_-]{0,61}[a-z0-9_])?\.)+[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])$/;

type Result = { ok: true; record: LocalDnsRecordInput } | { ok: false; reason: string };

function normalizeHost(raw: unknown, asciiLabel: string) {
  const host = typeof raw === 'string' ? raw.trim().toLowerCase().replace(/\.$/, '') : '';
  if (!host || host === '@') {
    return { ok: true as const, host: '@', fqdn: `${asciiLabel}.${BASE_ZONE_ASCII}` };
  }
  const labels = host.split('.');
  if (labels.some((label) => !HOST_LABEL_RE.test(label))) {
    return { ok: false as const, reason: 'ホスト名は英数字・ハイフン・アンダースコアで入力してください' };
  }
  const fqdn = `${host}.${asciiLabel}.${BASE_ZONE_ASCII}`;
  if (fqdn.length > 253) return { ok: false as const, reason: 'ホスト名が長すぎます' };
  return { ok: true as const, host, fqdn };
}

function hostname(raw: unknown): string | null {
  const value = typeof raw === 'string' ? raw.trim().toLowerCase().replace(/\.$/, '') : '';
  return TARGET_RE.test(value) ? value : null;
}

function forbiddenIpv6(value: string) {
  const lower = value.toLowerCase();
  return lower === '::' || lower === '::1' || lower.startsWith('fc') || lower.startsWith('fd') ||
    lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') ||
    lower.startsWith('feb') || lower.startsWith('ff');
}

export function validateDnsRecordInput(
  asciiLabel: string,
  raw: { host?: unknown; type?: unknown; value?: unknown; priority?: unknown },
): Result {
  const normalizedHost = normalizeHost(raw.host, asciiLabel);
  if (!normalizedHost.ok) return normalizedHost;
  const type = typeof raw.type === 'string' ? raw.type.toUpperCase() as DnsRecordType : null;
  if (!type || !TYPES.has(type)) return { ok: false, reason: '対応していないレコード種別です' };
  const input = typeof raw.value === 'string' ? raw.value.trim() : '';
  if (!input) return { ok: false, reason: '値を入力してください' };

  let value = input;
  let priority: number | null = null;
  if (type === 'A') {
    const parsed = parseTarget(input);
    if (!parsed.ok || parsed.target.kind !== 'A') {
      return { ok: false, reason: parsed.ok ? '公開IPv4を入力してください' : parsed.reason };
    }
    value = parsed.target.value;
  } else if (type === 'AAAA') {
    value = input.toLowerCase();
    if (isIP(value) !== 6) return { ok: false, reason: 'IPv6アドレスの形式を確認してください' };
    if (forbiddenIpv6(value)) return { ok: false, reason: 'ローカル・予約済みIPv6には向けられません' };
  } else if (type === 'CNAME' || type === 'MX') {
    const target = hostname(input);
    if (!target) return { ok: false, reason: '接続先ホスト名を入力してください' };
    if (target === normalizedHost.fqdn) return { ok: false, reason: '自分自身には向けられません' };
    value = target;
    if (type === 'MX') {
      const parsedPriority = Number(raw.priority);
      if (!Number.isInteger(parsedPriority) || parsedPriority < 0 || parsedPriority > 65535) {
        return { ok: false, reason: 'MX優先度は0〜65535の整数で入力してください' };
      }
      priority = parsedPriority;
    }
  } else if (type === 'TXT') {
    if (input.length > 4096) return { ok: false, reason: 'TXTは4096文字以内で入力してください' };
  } else if (type === 'CAA') {
    if (!/^(?:[0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\s+(?:issue|issuewild|iodef)\s+"[^"]+"$/i.test(input)) {
      return { ok: false, reason: 'CAAは 0 issue "letsencrypt.org" の形式で入力してください' };
    }
  }

  return {
    ok: true,
    record: { host: normalizedHost.host, fqdn: normalizedHost.fqdn, type, value, priority },
  };
}
