export type DnsProviderStatus = {
  provider: 'local-mock' | 'muu-sandbox';
  ready: boolean;
  writesEnabled: boolean;
  message: string;
};

export function dnsProviderStatus(): DnsProviderStatus {
  if (process.env.DNS_PROVIDER !== 'muu-sandbox') {
    return {
      provider: 'local-mock',
      ready: true,
      writesEnabled: false,
      message: 'ローカルDBだけを更新しています。公開DNSは変更しません。',
    };
  }

  const sandbox = process.env.MUU_API_ENVIRONMENT === 'sandbox';
  const configured = Boolean(
    process.env.MUU_API_BASE && process.env.MUU_DOMAIN_ID && process.env.MUU_API_TOKEN,
  );
  const writesEnabled = sandbox && configured && process.env.MUU_API_ALLOW_WRITES === 'true';
  return {
    provider: 'muu-sandbox',
    ready: sandbox && configured,
    writesEnabled,
    message: writesEnabled
      ? 'ムームーDNSのサンドボックス書き込みが有効です。'
      : 'サンドボックス設定を確認中です。公開DNSへの書き込みは停止しています。',
  };
}
