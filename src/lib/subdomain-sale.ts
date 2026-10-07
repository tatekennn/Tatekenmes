import { toAsciiLabel } from './punycode';
import { BASE_ZONE_ASCII, MAX_NAME_LEN, RESERVED } from './config';

const LABEL_RE = /^[0-9A-Za-z぀-ゟ゠-ヿ一-鿿々〆-]+$/u;
const KNOWN_OCCUPIED = new Set(['tukki', 'shop', 'evil', 'alice', 'bob']);

export type SubdomainValidation =
  | { ok: true; label: string; asciiLabel: string; fqdn: string; displayDomain: string }
  | { ok: false; reason: string };

export function validateSubdomain(raw: unknown): SubdomainValidation {
  const label = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (!label) return { ok: false, reason: 'サブドメイン名を入力してください' };
  if ([...label].length > MAX_NAME_LEN) {
    return { ok: false, reason: `${MAX_NAME_LEN}文字以内で入力してください` };
  }
  if (!LABEL_RE.test(label) || label.startsWith('-') || label.endsWith('-')) {
    return { ok: false, reason: '日本語・英数字・途中のハイフンが使えます' };
  }
  if (RESERVED.has(label) || KNOWN_OCCUPIED.has(label)) {
    return { ok: false, reason: 'そのサブドメインは使えません' };
  }

  const asciiLabel = toAsciiLabel(label);
  if (asciiLabel.length > 63) {
    return { ok: false, reason: 'DNSで扱える長さを超えています' };
  }

  return {
    ok: true,
    label,
    asciiLabel,
    fqdn: `${asciiLabel}.${BASE_ZONE_ASCII}`,
    displayDomain: `${label}.覇気.com`,
  };
}

export type DnsRecordType = 'A' | 'AAAA' | 'CNAME' | 'TXT' | 'MX' | 'CAA';
export type DnsMode = 'HOSTED' | 'CUSTOM';

export type DemoDnsRecord = {
  id: string;
  host: string;
  fqdn: string;
  type: DnsRecordType;
  value: string;
  priority: number | null;
  updatedAt: string;
};

export type DemoPurchase = {
  asciiLabel: string;
  displayDomain: string;
  label: string;
  email: string;
  orderId: string;
  createdAt: string;
  dnsMode: DnsMode;
  records: DemoDnsRecord[];
};
