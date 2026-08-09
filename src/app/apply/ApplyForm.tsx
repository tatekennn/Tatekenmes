'use client';

import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';

const MAX_NAME = 20;

type Phase = 'idle' | 'creating' | 'waiting' | 'done' | 'error';

export default function ApplyForm() {
  const [name, setName] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [message, setMessage] = useState('');
  const [targetUrl, setTargetUrl] = useState('');

  const trimmed = name.trim().slice(0, MAX_NAME);
  const valid = trimmed.length > 0;
  const busy = phase === 'creating' || phase === 'waiting';

  const previewDomain = useMemo(
    () => (valid ? `${trimmed}の.覇気.com` : '〇〇の.覇気.com'),
    [trimmed, valid],
  );

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!valid || busy) return;
    setPhase('creating');
    setMessage('覇気を注入中…');
    try {
      const res = await fetch('/api/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPhase('error');
        setMessage(data?.error ?? '生成に失敗しました');
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
        <p className="apply-kicker">覇気.com</p>
        <h1 className="apply-title">覇気を、その名に。</h1>
        <p className="apply-lead">
          名前を入れると <strong>{previewDomain}</strong> があなたの覇気全開ページになる。
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

        <button className="apply-button" type="submit" disabled={!valid || busy}>
          {busy ? '生成中…' : '覇気を放つ ⚡'}
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
          <p className="apply-note">※ 送信すると本物のサブドメインが生成されます。</p>
        )}
      </form>
    </main>
  );
}
