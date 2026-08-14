'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';

const MAX_NAME = 20;

type Phase = 'idle' | 'creating' | 'waiting' | 'done' | 'error';
type Plan = 'hosted' | 'byo';

export default function ApplyForm() {
  const [name, setName] = useState('');
  const [plan, setPlan] = useState<Plan>('hosted');
  const [target, setTarget] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [message, setMessage] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/stock')
      .then((r) => r.json())
      .then((d) => setRemaining(typeof d?.remaining === 'number' ? d.remaining : null))
      .catch(() => {});
  }, []);

  const trimmed = name.trim().slice(0, MAX_NAME);
  const targetTrimmed = target.trim();
  const valid = trimmed.length > 0 && (plan === 'hosted' || targetTrimmed.length > 0);
  const busy = phase === 'creating' || phase === 'waiting';

  const previewDomain = useMemo(
    () => (trimmed ? `${trimmed}の.覇気.com` : '〇〇の.覇気.com'),
    [trimmed],
  );

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!valid || busy) return;
    setPhase('creating');
    setMessage(plan === 'byo' ? '区画を分譲中…' : '覇気を注入中…');
    try {
      const res = await fetch('/api/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          plan === 'byo' ? { name: trimmed, target: targetTrimmed } : { name: trimmed },
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        setPhase('error');
        setMessage(data?.error ?? '手続きに失敗しました');
        return;
      }
      if (data.status === 'sold') {
        // 持ち込みプラン成約：向き先は買い手のサーバーなので遷移はしない
        setPhase('done');
        setMessage(
          `成約！ ${data.domain} → ${data.record.value} (${data.record.type}) ${data.note}`,
        );
        return;
      }
      setTargetUrl(data.url);
      if (data.status === 'exists') {
        setPhase('done');
        setMessage('もう存在します。開きます…');
        window.location.href = data.url;
        return;
      }
      // 証明書発行を待ってから遷移
      setPhase('waiting');
      setMessage('ページを生成中…（証明書発行を待っています）');
      window.setTimeout(() => {
        setPhase('done');
        window.location.href = data.url;
      }, 12_000);
    } catch {
      setPhase('error');
      setMessage('通信に失敗しました。時間をおいて再度お試しください');
    }
  };

  return (
    <main className="apply-stage">
      <div className="aura aura-one" />
      <div className="aura aura-two" />

      <form className="apply-card" onSubmit={onSubmit}>
        <p className="apply-kicker">
          覇気.com サブドメイン分譲
          {remaining !== null && ` — 残り${remaining}区画`}
        </p>
        <h1 className="apply-title">覇気を、その名に。</h1>
        <p className="apply-lead">
          <strong>{previewDomain}</strong> を分譲します（いまなら ¥0 キャンペーン中）。
        </p>

        <label className="apply-field">
          <span className="apply-label">なまえ</span>
          <input
            className="apply-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例：たてけん"
            maxLength={MAX_NAME}
            disabled={busy}
            autoFocus
          />
        </label>

        <div className="apply-field" role="radiogroup" aria-label="プラン">
          <span className="apply-label">プラン</span>
          <label className="apply-plan-option">
            <input
              type="radio"
              name="plan"
              checked={plan === 'hosted'}
              onChange={() => setPlan('hosted')}
              disabled={busy}
            />
            <span>
              <strong>入居プラン</strong> — 覇気全開ページ付き（おまかせ）
            </span>
          </label>
          <label className="apply-plan-option">
            <input
              type="radio"
              name="plan"
              checked={plan === 'byo'}
              onChange={() => setPlan('byo')}
              disabled={busy}
            />
            <span>
              <strong>持ち込みプラン</strong> — 自分のサーバーに向ける
            </span>
          </label>
        </div>

        {plan === 'byo' && (
          <label className="apply-field">
            <span className="apply-label">向き先（IP または ホスト名）</span>
            <input
              className="apply-input"
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="例：myapp.vercel.app / 203.0.113.10"
              disabled={busy}
            />
          </label>
        )}

        <button className="apply-button" type="submit" disabled={!valid || busy}>
          {busy ? '手続き中…' : plan === 'byo' ? 'この区画を契約する 📄' : '覇気を放つ ⚡'}
        </button>

        {phase !== 'idle' && (
          <p className={`apply-status apply-status--${phase}`}>
            {message}
            {targetUrl && phase !== 'error' && (
              <>
                {' '}
                <a className="apply-link" href={targetUrl}>
                  {targetUrl.replace('https://', '')}
                </a>
              </>
            )}
          </p>
        )}

        {phase === 'idle' && (
          <p className="apply-note">
            ※ 送信すると本物のDNSレコードが作成されます。
            {plan === 'byo' && ' HTTPS証明書は向き先サーバー側でご用意ください。'}
          </p>
        )}
      </form>
    </main>
  );
}
