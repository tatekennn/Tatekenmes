'use client';

import { useEffect, useState } from 'react';

type DnsType = 'A' | 'AAAA' | 'CNAME' | 'TXT' | 'MX' | 'CAA';
type DnsMode = 'HOSTED' | 'CUSTOM';
type DnsRecord = {
  id: string;
  host: string;
  fqdn: string;
  type: DnsType;
  value: string;
  priority: number | null;
  updatedAt: string;
};
type Domain = {
  asciiLabel: string;
  displayDomain: string;
  orderId: string;
  dnsMode: DnsMode;
  records: DnsRecord[];
};
type User = { id: string; email: string };
type DnsProviderStatus = { provider: 'local-mock' | 'muu-sandbox'; ready: boolean; writesEnabled: boolean; message: string };

const PLACEHOLDERS: Record<DnsType, string> = {
  A: '8.8.8.8',
  AAAA: '2001:4860:4860::8888',
  CNAME: 'myapp.example.com',
  TXT: 'google-site-verification=...',
  MX: 'mail.example.com',
  CAA: '0 issue "letsencrypt.org"',
};

export default function DashboardClient() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [selected, setSelected] = useState('');
  const [mode, setMode] = useState<DnsMode>('HOSTED');
  const [host, setHost] = useState('@');
  const [type, setType] = useState<DnsType>('A');
  const [value, setValue] = useState('');
  const [priority, setPriority] = useState('10');
  const [editingId, setEditingId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [provider, setProvider] = useState<DnsProviderStatus | null>(null);

  useEffect(() => {
    fetch('/api/local-sales/dns', { cache: 'no-store' })
      .then(async (res) => ({ ok: res.ok, status: res.status, data: await res.json() }))
      .then(({ ok, status, data }) => {
        if (!ok && status === 401) {
          setAuthRequired(true);
          return;
        }
        setUser(data?.user ?? null);
        setProvider(data?.dnsProvider ?? null);
        const next = Array.isArray(data?.domains) ? data.domains : [];
        setDomains(next);
        if (next[0]) {
          setSelected(next[0].asciiLabel);
          setMode(next[0].dnsMode);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const domain = domains.find((item) => item.asciiLabel === selected);

  const resetForm = () => {
    setHost('@');
    setType('A');
    setValue('');
    setPriority('10');
    setEditingId('');
  };

  const applyUpdatedDomain = (updated: Domain) => {
    setDomains((current) => current.map((item) => item.asciiLabel === updated.asciiLabel ? updated : item));
    setMode(updated.dnsMode);
  };

  const post = async (body: Record<string, unknown>, successMessage: string) => {
    if (!selected || saving) return null;
    setSaving(true);
    setMessage('DNS設定を検証中…');
    try {
      const res = await fetch('/api/local-sales/dns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asciiLabel: selected, ...body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? '更新に失敗しました');
      applyUpdatedDomain(data.domain);
      setProvider(data?.dnsProvider ?? null);
      setMessage(successMessage);
      return data.domain as Domain;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '更新に失敗しました');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const chooseDomain = (asciiLabel: string) => {
    const next = domains.find((item) => item.asciiLabel === asciiLabel);
    if (!next) return;
    setSelected(asciiLabel);
    setMode(next.dnsMode);
    resetForm();
    setMessage('');
  };

  const saveMode = async () => {
    const updated = await post(
      { action: 'set-mode', mode },
      mode === 'HOSTED' ? '覇気.com 入居ページへ切り替えました' : 'カスタムDNSを有効にしました',
    );
    if (updated && mode === 'HOSTED') resetForm();
  };

  const saveRecord = async () => {
    const updated = await post(
      {
        action: editingId ? 'update-record' : 'create-record',
        recordId: editingId || undefined,
        host,
        type,
        value,
        priority: type === 'MX' ? priority : undefined,
      },
      editingId ? 'DNSレコードを更新しました' : 'DNSレコードを追加しました',
    );
    if (updated) resetForm();
  };

  const editRecord = (record: DnsRecord) => {
    setMode('CUSTOM');
    setHost(record.host);
    setType(record.type);
    setValue(record.value);
    setPriority(String(record.priority ?? 10));
    setEditingId(record.id);
    setMessage('');
  };

  const deleteRecord = async (record: DnsRecord) => {
    const updated = await post(
      { action: 'delete-record', recordId: record.id },
      `${record.host} の ${record.type} レコードを削除しました`,
    );
    if (updated && editingId === record.id) resetForm();
  };

  return (
    <main className="apply-stage dashboard-stage">
      <div className="aura aura-one" />
      <div className="aura aura-two" />
      <section className="apply-card apply-card--sale dashboard-card" aria-labelledby="dashboard-title">
        <div className="demo-badge">DNS管理</div>
        <p className="apply-kicker">OWNER CONSOLE</p>
        <h1 className="apply-title" id="dashboard-title">DNSを管理する</h1>
        <p className="apply-lead">取得した区画と、その配下のホストだけを変更できます。</p>

        {provider && (
          <div className="account-panel">
            <span>{provider.provider === 'local-mock' ? 'DNS: ローカル模擬' : 'DNS: Muu sandbox'}</span>
            <strong>{provider.message}</strong>
          </div>
        )}

        {user && <div className="account-panel"><span>ログイン中</span><strong>{user.email}</strong></div>}
        {loading && <p className="apply-status">取得情報を読み込み中…</p>}
        {!loading && authRequired && (
          <div className="empty-panel"><p>DNS管理にはログインが必要です。</p><a className="apply-button apply-button--link" href="/login">ローカルでログイン</a></div>
        )}
        {!loading && !authRequired && !domain && (
          <div className="empty-panel"><p>取得したサブドメインがありません。</p><a className="apply-button apply-button--link" href="/apply">無料で取得する</a></div>
        )}

        {domain && (
          <div className="dns-panel">
            <label className="apply-field">
              <span className="apply-label">管理するドメイン</span>
              <select className="apply-input" value={selected} onChange={(event) => chooseDomain(event.target.value)}>
                {domains.map((item) => <option key={item.asciiLabel} value={item.asciiLabel}>{item.displayDomain}</option>)}
              </select>
            </label>

            <div className="dns-mode-panel">
              <label className="apply-field">
                <span className="apply-label">接続方式</span>
                <select className="apply-input" value={mode} onChange={(event) => setMode(event.target.value as DnsMode)}>
                  <option value="HOSTED">覇気.com 入居ページ</option>
                  <option value="CUSTOM">カスタムDNS</option>
                </select>
              </label>
              {mode === 'HOSTED' && domain.records.length > 0 && <p className="dns-warning">保存するとカスタムDNSレコードを削除します。</p>}
              <button className="apply-button apply-button--secondary" type="button" onClick={saveMode} disabled={saving || mode === domain.dnsMode}>
                接続方式を保存
              </button>
            </div>

            {mode === 'HOSTED' ? (
              <div className="dns-preview"><span>{domain.displayDomain}</span><strong>HOSTED</strong><code>覇気.com 入居ページ</code></div>
            ) : (
              <>
                <div className="dns-record-list">
                  <div className="dns-section-heading"><strong>DNSレコード</strong><span>{domain.records.length} / 25</span></div>
                  {domain.records.length === 0 && <p className="dns-empty">まだレコードがありません。</p>}
                  {domain.records.map((record) => (
                    <article className="dns-record-row" key={record.id}>
                      <div className="dns-record-head"><strong>{record.type}</strong><code>{record.host === '@' ? domain.displayDomain : `${record.host}.${domain.displayDomain}`}</code></div>
                      <p>{record.value}{record.priority !== null ? ` · 優先度 ${record.priority}` : ''}</p>
                      <div className="dns-record-actions">
                        <button type="button" className="text-button" onClick={() => editRecord(record)}>編集</button>
                        <button type="button" className="text-button text-button--danger" onClick={() => deleteRecord(record)} disabled={saving}>削除</button>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="dns-editor">
                  <div className="dns-section-heading"><strong>{editingId ? 'レコードを編集' : 'レコードを追加'}</strong></div>
                  <label className="apply-field">
                    <span className="apply-label">ホスト（@ または区画内の名前）</span>
                    <div className="domain-input-row">
                      <input className="apply-input" value={host} onChange={(event) => setHost(event.target.value)} placeholder="@ / www / _acme-challenge" />
                      <span>.{domain.displayDomain}</span>
                    </div>
                  </label>
                  <label className="apply-field">
                    <span className="apply-label">種別</span>
                    <select className="apply-input" value={type} onChange={(event) => { setType(event.target.value as DnsType); setValue(''); }}>
                      <option value="A">A（IPv4）</option>
                      <option value="AAAA">AAAA（IPv6）</option>
                      <option value="CNAME">CNAME（別名）</option>
                      <option value="TXT">TXT（認証・SPF・DKIM）</option>
                      <option value="MX">MX（メール）</option>
                      <option value="CAA">CAA（証明書）</option>
                    </select>
                  </label>
                  <label className="apply-field">
                    <span className="apply-label">値</span>
                    <input className="apply-input" value={value} onChange={(event) => setValue(event.target.value)} placeholder={PLACEHOLDERS[type]} />
                  </label>
                  {type === 'MX' && (
                    <label className="apply-field"><span className="apply-label">優先度</span><input className="apply-input" type="number" min="0" max="65535" value={priority} onChange={(event) => setPriority(event.target.value)} /></label>
                  )}
                  <button className="apply-button" type="button" onClick={saveRecord} disabled={saving || !host.trim() || !value.trim()}>
                    {saving ? '保存中…' : editingId ? '変更を保存' : 'DNSレコードを追加'}
                  </button>
                  {editingId && <button className="text-button" type="button" onClick={resetForm}>編集をキャンセル</button>}
                </div>
              </>
            )}
            {message && <p className="apply-status">{message}</p>}
            <p className="apply-note">TTLは本番Muu APIに合わせて3600秒を想定。現在はローカルDBだけを更新します。</p>
          </div>
        )}
      </section>
    </main>
  );
}
