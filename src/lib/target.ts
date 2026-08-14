import { BASE_ZONE_ASCII } from './config';

// 持ち込みプランの「向き先」。A=IPアドレス / CNAME=ホスト名。
export type Target = { kind: 'A'; value: string } | { kind: 'CNAME'; value: string };

export type ParseTargetResult = { ok: true; target: Target } | { ok: false; reason: string };

const IPV4_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

// ホスト名(ASCII)。日本語のまま入れられた場合は弾いてpunycodeでの入力を促す。
const HOSTNAME_RE = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

/** 公開インターネットに存在し得ないIP帯（RFC 1918/5735ほか）。
 * 分譲したサブドメインを内部ネットワークやループバックに向けさせない。 */
function isForbiddenIp(a: number, b: number, c: number): boolean {
  if (a === 0 || a === 10 || a === 127) return true; // this-network / private / loopback
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a === 169 && b === 254) return true; // link-local
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 0) return true; // 192.0.0.0/24 + 192.0.2.0/24 (doc)
  if (a === 192 && b === 168) return true; // private
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  if (a === 198 && b === 51 && c === 100) return true; // doc
  if (a === 203 && b === 0 && c === 113) return true; // doc
  if (a >= 224) return true; // multicast / reserved / broadcast
  return false;
}

/** 持ち込みプランの向き先を検証して A/CNAME に振り分ける */
export function parseTarget(raw: unknown): ParseTargetResult {
  const value = typeof raw === 'string' ? raw.trim().toLowerCase().replace(/\.$/, '') : '';
  if (!value) return { ok: false, reason: '向き先を入力してください' };

  const m = value.match(IPV4_RE);
  if (m) {
    const [a, b, c, d] = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])];
    if ([a, b, c, d].some((n) => n > 255)) {
      return { ok: false, reason: 'IPアドレスの形式が不正です' };
    }
    if (isForbiddenIp(a, b, c)) {
      return { ok: false, reason: 'そのIPアドレス帯には向けられません（公開IPのみ）' };
    }
    return { ok: true, target: { kind: 'A', value } };
  }

  if (value === 'localhost' || value.endsWith('.localhost')) {
    return { ok: false, reason: 'そのホスト名には向けられません' };
  }
  if (value === BASE_ZONE_ASCII || value.endsWith(`.${BASE_ZONE_ASCII}`)) {
    return { ok: false, reason: '覇気.com 配下には向けられません（ループ防止）' };
  }
  if (!HOSTNAME_RE.test(value)) {
    return {
      ok: false,
      reason: 'IPアドレスまたはホスト名（例: myapp.vercel.app）を入力してください',
    };
  }
  return { ok: true, target: { kind: 'CNAME', value } };
}
