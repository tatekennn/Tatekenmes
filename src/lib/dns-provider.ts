export type DnsProviderStatus = {
  provider: 'local-mock' | 'neon-only' | 'muu-production';
  ready: boolean;
  writesEnabled: boolean;
  message: string;
};

export function dnsProviderStatus(): DnsProviderStatus {
  const cloudDatabase = Boolean(process.env.DATABASE_URL);
  const production = process.env.VERCEL_ENV === 'production';
  const muuConfigured = Boolean(process.env.MUU_API_TOKEN);

  if (cloudDatabase && production && muuConfigured) {
    return {
      provider: 'muu-production',
      ready: true,
      writesEnabled: true,
      message: 'Neon DBに保存し、ムームーDNSの公開レコードへ反映します。',
    };
  }

  if (cloudDatabase) {
    return {
      provider: 'neon-only',
      ready: true,
      writesEnabled: false,
      message: 'Neon DBを使用中です。公開DNSの書き込みは本番環境だけで有効です。',
    };
  }

  return {
    provider: 'local-mock',
    ready: true,
    writesEnabled: false,
    message: '開発用のローカルDBです。公開DNSは変更しません。',
  };
}
