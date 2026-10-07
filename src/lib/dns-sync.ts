import { BASE_ZONE_ASCII, VERCEL_A_IP } from './config';
import { dnsProviderStatus } from './dns-provider';
import {
  createRecord,
  deleteRecord,
  listRecords,
  MuuApiError,
  updateRecord,
  type MuuDnsRecord,
} from './muu';
import type { DemoDnsRecord, DnsMode } from './subdomain-sale';

function normalizedName(value: string) {
  return value.toLowerCase().replace(/\.$/, '');
}

function sameValue(record: MuuDnsRecord, wanted: DemoDnsRecord) {
  const left = wanted.type === 'CNAME' || wanted.type === 'MX'
    ? normalizedName(record.value)
    : record.value;
  const right = wanted.type === 'CNAME' || wanted.type === 'MX'
    ? normalizedName(wanted.value)
    : wanted.value;
  return left === right && (wanted.type !== 'MX' || Number(record.priority) === wanted.priority);
}

function isOwnedName(fqdn: string, asciiLabel: string) {
  const root = `${asciiLabel}.${BASE_ZONE_ASCII}`;
  const name = normalizedName(fqdn);
  return name === root || name.endsWith(`.${root}`);
}

function requireProductionWrites() {
  if (!dnsProviderStatus().writesEnabled) {
    throw new Error('公開DNSへの書き込みはVercel本番環境でのみ有効です');
  }
}

async function removeHostedRecord(asciiLabel: string) {
  const root = `${asciiLabel}.${BASE_ZONE_ASCII}`;
  const records = await listRecords(root);
  for (const record of records) {
    if (record.type === 'A' && record.value === VERCEL_A_IP) await deleteRecord(record.id);
  }
}

export async function syncMuuDnsMode(asciiLabel: string, mode: DnsMode) {
  requireProductionWrites();
  const root = `${asciiLabel}.${BASE_ZONE_ASCII}`;
  if (mode === 'CUSTOM') {
    await removeHostedRecord(asciiLabel);
    return;
  }

  const records = await listRecords();
  for (const record of records.filter((item) => isOwnedName(item.fqdn, asciiLabel))) {
    await deleteRecord(record.id);
  }
  await createRecord(root, 'A', VERCEL_A_IP);
}

export async function syncMuuDnsRecord(
  asciiLabel: string,
  record: DemoDnsRecord,
  previous?: DemoDnsRecord,
) {
  requireProductionWrites();
  await removeHostedRecord(asciiLabel);

  const providerId = previous?.providerRecordId ?? record.providerRecordId;
  const identityChanged = Boolean(previous && (
    normalizedName(previous.fqdn) !== normalizedName(record.fqdn) || previous.type !== record.type
  ));

  if (providerId && !identityChanged) {
    try {
      const updated = await updateRecord(providerId, record.type, record.value, record.priority);
      return String(updated.id);
    } catch (error) {
      if (!(error instanceof MuuApiError) || error.status !== 404) throw error;
    }
  }

  if (providerId && identityChanged) await deleteRecord(providerId);

  const existing = await listRecords(record.fqdn);
  const exact = existing.find((item) => item.type === record.type && sameValue(item, record));
  if (exact) return String(exact.id);

  const created = await createRecord(record.fqdn, record.type, record.value, record.priority);
  return String(created.id);
}

export async function deleteMuuDnsRecord(record: DemoDnsRecord) {
  requireProductionWrites();
  if (record.providerRecordId) {
    await deleteRecord(record.providerRecordId);
    return;
  }
  const existing = await listRecords(record.fqdn);
  for (const item of existing.filter((candidate) => candidate.type === record.type && sameValue(candidate, record))) {
    await deleteRecord(item.id);
  }
}
