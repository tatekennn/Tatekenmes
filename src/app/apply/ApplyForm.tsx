'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';

type Phase = 'search' | 'checking' | 'confirm' | 'claiming' | 'done' | 'error';
type Stock = { total: number; sold: number; remaining: number };
type User = { id: string; email: string };

export default function ApplyForm() {
  const [label, setLabel] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>('search');
  const [message, setMessage] = useState('');
  const [orderId, setOrderId] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [stock, setStock] = useState<Stock | null>(null);

  useEffect(() => {
    fetch('/api/local-sales', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (typeof data?.remaining === 'number') setStock(data);
      })
      .catch(() => {});
    fetch('/api/local-auth', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => setUser(data?.user ?? null))
      .finally(() => setAuthLoading(false));
  }, []);

  const trimmed = label.trim().slice(0, 20);
  const displayDomain = useMemo(() => `${trimmed || 'あなた'}.覇気.com`, [trimmed]);
  const busy = phase === 'checking' || phase === 'claiming';

  const restart = () => {
    setPhase('search');
    setMessage('');
    setOrderId('');
    setPreviewUrl('');
  };

  const checkAvailability = async (event: FormEvent) => {
    event.preventDefault();
    if (!trimmed || busy) return;
    setPhase('checking');
    setMessage('空きを確認しています…');
    try {
      const res = await fetch('/api/local-sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check', label: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? '空き確認に失敗しました');
      setStock(data);
      setMessage(`${data.domain} は申し込めます`);
      setPhase('confirm');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '空き確認に失敗しました');
      setPhase('error');
    }
  };

  const claim = async () => {
    if (!user || busy) return;
    setPhase('claiming');
    setMessage('無料区画を発行しています…');
    try {
      const res = await fetch('/api/local-sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'claim', label: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? '申込みに失敗しました');
      setOrderId(data.orderId);
      setPreviewUrl(data.previewUrl);
      setStock(data);
      setMessage(`${data.domain} の無料発行が完了しました`);
      setPhase('done');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '申込みに失敗しました');
      setPhase('error');
    }
  };

  return (
    <main className="apply-stage">
      <div className="aura aura-one" />
      <div className="aura aura-two" />
      <section className="apply-card apply-card--sale" aria-labelledby="sale-title">
        <div className="demo-badge">先着無料 · 1アカウント1区画</div>
        <p className="apply-kicker">覇気.com SUBDOMAIN</p>
        <h1 className="apply-title" id="sale-title">その名前に、覇気を。</h1>
        <p className="apply-lead">
          <strong>{displayDomain}</strong>
          <br />あなた専用の覇気ページを、無料で取得。
        </p>

        {stock && (
          <div className="stock-meter" aria-label={`残り${stock.remaining}区画`}>
            <span>限定 {stock.total}区画</span>
            <strong>残り {stock.remaining}</strong>
          </div>
        )}

        {phase !== 'done' && (
          <form onSubmit={checkAvailability}>
            <label className="apply-field">
              <span className="apply-label">希望するサブドメイン</span>
              <div className="domain-input-row">
                <input
                  className="apply-input"
                  value={label}
                  onChange={(event) => {
                    setLabel(event.target.value);
                    if (phase !== 'search') restart();
                  }}
                  placeholder="例：tateken"
                  maxLength={20}
                  disabled={busy || phase === 'confirm'}
                  autoFocus
                />
                <span>.覇気.com</span>
              </div>
            </label>
            {(phase === 'search' || phase === 'checking' || phase === 'error') && (
              <button className="apply-button" type="submit" disabled={!trimmed || busy}>
                {phase === 'checking' ? '確認中…' : '空きを確認する'}
              </button>
            )}
          </form>
        )}

        {(phase === 'confirm' || phase === 'claiming') && (
          <div className="checkout-panel">
            <div className="price-row">
              <span>覇気.com 無料区画</span>
              <strong>¥0</strong>
            </div>
            {authLoading && <p className="apply-status">ログイン状態を確認中…</p>}
            {!authLoading && user && (
              <>
                <div className="account-panel">
                  <span>購入者</span>
                  <strong>{user.email}</strong>
                </div>
                <button className="apply-button" type="button" onClick={claim} disabled={busy}>
                  {phase === 'claiming' ? '発行中…' : '無料で取得する'}
                </button>
              </>
            )}
            {!authLoading && !user && (
              <div className="empty-panel">
                <p>購入にはログインが必要です。</p>
                <a className="apply-button apply-button--link" href="/login">ローカルでログイン</a>
              </div>
            )}
            <button className="text-button" type="button" onClick={restart} disabled={busy}>
              別の名前を選ぶ
            </button>
          </div>
        )}

        {message && <p className={`apply-status apply-status--${phase}`}>{message}</p>}
        {phase === 'done' && (
          <div className="success-panel">
            <div className="success-mark" aria-hidden="true">✓</div>
            <h2>無料取得完了</h2>
            <p><strong>{displayDomain}</strong></p>
            <p className="order-id">申込番号: {orderId}</p>
            <a className="apply-button apply-button--link" href={previewUrl}>発行後のページを見る</a>
            <a className="apply-button apply-button--secondary" href="/dashboard">DNS管理画面へ</a>
            <button className="text-button" type="button" onClick={restart}>続けて試す</button>
          </div>
        )}
        <p className="apply-note">
          決済情報は不要です。取得後はダッシュボードから接続先を設定できます。
        </p>
      </section>
    </main>
  );
}
