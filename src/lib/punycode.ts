// RFC 3492 punycode（単一ラベル用）。Edge ランタイムでも動くよう依存なしで実装。
// 日本語ラベル ⇄ xn-- 形式の相互変換に使う。

const BASE = 36;
const T_MIN = 1;
const T_MAX = 26;
const SKEW = 38;
const DAMP = 700;
const INITIAL_BIAS = 72;
const INITIAL_N = 128;
const DELIMITER = '-';
const MAX_INT = 2147483647;
const RE_PUNYCODE = /^xn--/;
const RE_NON_ASCII = /[^\0-\x7F]/;

function ucs2decode(str: string): number[] {
  const output: number[] = [];
  let counter = 0;
  while (counter < str.length) {
    const value = str.charCodeAt(counter++);
    if (value >= 0xd800 && value <= 0xdbff && counter < str.length) {
      const extra = str.charCodeAt(counter++);
      if ((extra & 0xfc00) === 0xdc00) {
        output.push(((value & 0x3ff) << 10) + (extra & 0x3ff) + 0x10000);
      } else {
        output.push(value);
        counter--;
      }
    } else {
      output.push(value);
    }
  }
  return output;
}

function basicToDigit(codePoint: number): number {
  if (codePoint - 0x30 < 0x0a) return codePoint - 0x16;
  if (codePoint - 0x41 < 0x1a) return codePoint - 0x41;
  if (codePoint - 0x61 < 0x1a) return codePoint - 0x61;
  return BASE;
}

function digitToBasic(digit: number): number {
  return digit + 22 + 75 * (digit < 26 ? 1 : 0);
}

function adapt(delta: number, numPoints: number, firstTime: boolean): number {
  let k = 0;
  delta = firstTime ? Math.floor(delta / DAMP) : delta >> 1;
  delta += Math.floor(delta / numPoints);
  for (; delta > ((BASE - T_MIN) * T_MAX) >> 1; k += BASE) {
    delta = Math.floor(delta / (BASE - T_MIN));
  }
  return Math.floor(k + ((BASE - T_MIN + 1) * delta) / (delta + SKEW));
}

function decode(input: string): string {
  const output: number[] = [];
  let i = 0;
  let n = INITIAL_N;
  let bias = INITIAL_BIAS;

  let basic = input.lastIndexOf(DELIMITER);
  if (basic < 0) basic = 0;
  for (let j = 0; j < basic; ++j) {
    output.push(input.charCodeAt(j));
  }

  for (let index = basic > 0 ? basic + 1 : 0; index < input.length; ) {
    const oldi = i;
    for (let w = 1, k = BASE; ; k += BASE) {
      const digit = basicToDigit(input.charCodeAt(index++));
      i += digit * w;
      const t = k <= bias ? T_MIN : k >= bias + T_MAX ? T_MAX : k - bias;
      if (digit < t) break;
      w *= BASE - t;
    }
    const out = output.length + 1;
    bias = adapt(i - oldi, out, oldi === 0);
    n += Math.floor(i / out);
    i %= out;
    output.splice(i++, 0, n);
  }

  return String.fromCodePoint(...output);
}

function encode(input: string): string {
  const output: string[] = [];
  const codePoints = ucs2decode(input);
  const inputLength = codePoints.length;
  let n = INITIAL_N;
  let delta = 0;
  let bias = INITIAL_BIAS;

  for (const cp of codePoints) {
    if (cp < 0x80) output.push(String.fromCharCode(cp));
  }
  const basicLength = output.length;
  let handled = basicLength;
  if (basicLength) output.push(DELIMITER);

  while (handled < inputLength) {
    let m = MAX_INT;
    for (const cp of codePoints) {
      if (cp >= n && cp < m) m = cp;
    }
    const handledPlusOne = handled + 1;
    if (m - n > Math.floor((MAX_INT - delta) / handledPlusOne)) throw new RangeError('overflow');
    delta += (m - n) * handledPlusOne;
    n = m;
    for (const cp of codePoints) {
      if (cp < n && ++delta > MAX_INT) throw new RangeError('overflow');
      if (cp === n) {
        let q = delta;
        for (let k = BASE; ; k += BASE) {
          const t = k <= bias ? T_MIN : k >= bias + T_MAX ? T_MAX : k - bias;
          if (q < t) break;
          const qMinusT = q - t;
          const baseMinusT = BASE - t;
          output.push(String.fromCharCode(digitToBasic(t + (qMinusT % baseMinusT))));
          q = Math.floor(qMinusT / baseMinusT);
        }
        output.push(String.fromCharCode(digitToBasic(q)));
        bias = adapt(delta, handledPlusOne, handled === basicLength);
        delta = 0;
        ++handled;
      }
    }
    ++delta;
    ++n;
  }

  return output.join('');
}

/** 日本語などを含むラベルを xn-- 形式へ。ASCII のみならそのまま返す。 */
export function toAsciiLabel(label: string): string {
  return RE_NON_ASCII.test(label) ? 'xn--' + encode(label) : label;
}

/** xn-- 形式のラベルを Unicode へ。xn-- で無ければそのまま返す。 */
export function toUnicodeLabel(label: string): string {
  return RE_PUNYCODE.test(label) ? decode(label.slice(4)) : label;
}
