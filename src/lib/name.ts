import { toAsciiLabel, toUnicodeLabel } from './punycode';
import { BASE_ZONE_ASCII, SUFFIX, MAX_NAME_LEN, RESERVED } from './config';

// 許可文字：英数字・ひらがな・カタカナ・漢字・長音/々
const NAME_RE = /^[0-9A-Za-z぀-ゟ゠-ヿ一-鿿々〆]+$/u;

/** 表示名 → DNSラベル(Unicode)「<name>の」。
 * DNSラベルは大文字小文字を区別せず正規形は小文字なので、必ず小文字化する。
 * （小文字化しないと `Yours` が `xn--Yours-...` という不正な punycode になり DNS/Vercel API に弾かれる） */
function label(name: string): string {
  return `${name.toLowerCase()}${SUFFIX}`;
}

/** 表示名 → FQDN(ASCII, 末尾ドット無し)「xn--….xn--7qwx14d.com」 */
export function fqdnFor(name: string): string {
  return `${toAsciiLabel(label(name))}.${BASE_ZONE_ASCII}`;
}

/** Host(ASCII) → 表示名。対象外なら null。 */
export function nameFromHost(host: string): string | null {
  const h = host.toLowerCase().replace(/\.$/, '');
  const suffix = `.${BASE_ZONE_ASCII}`;
  if (!h.endsWith(suffix)) return null;
  const lbl = h.slice(0, -suffix.length);
  if (!lbl || lbl.includes('.')) return null; // 多段サブドメインは対象外
  const uni = toUnicodeLabel(lbl);
  if (!uni.endsWith(SUFFIX)) return null; // 「〜の」以外は対象外
  return uni.slice(0, -SUFFIX.length);
}

export type ValidateResult = { ok: true; name: string } | { ok: false; reason: string };

/** 入力名のバリデーション（インジェクション・乗っ取り・長すぎ防止） */
export function validateName(raw: unknown): ValidateResult {
  const name = typeof raw === 'string' ? raw.trim() : '';
  if (!name) return { ok: false, reason: '名前を入力してください' };
  if ([...name].length > MAX_NAME_LEN) {
    return { ok: false, reason: `${MAX_NAME_LEN}文字以内で入力してください` };
  }
  if (!NAME_RE.test(name)) {
    return { ok: false, reason: '使えるのは日本語・英数字だけです' };
  }
  if (RESERVED.has(name.toLowerCase())) {
    return { ok: false, reason: 'その名前は使えません' };
  }
  // DNSラベルは63オクテット上限（xn--変換後で判定）
  if (toAsciiLabel(label(name)).length > 63) {
    return { ok: false, reason: '名前が長すぎます' };
  }
  return { ok: true, name };
}
