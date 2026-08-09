'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';

// 名前として許可する最大長
const MAX_NAME = 20;

export default function ApplyForm() {
  const [name, setName] = useState('');
  const router = useRouter();

  const trimmed = name.trim().slice(0, MAX_NAME);
  const valid = trimmed.length > 0;

  // 生成される（予定の）サブドメイン表記
  const previewDomain = useMemo(() => (valid ? `${trimmed}の.覇気.com` : '〇〇の.覇気.com'), [
    trimmed,
    valid,
  ]);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    // ※ 現時点では体験プレビュー。将来はここで /api/create を叩いて実サブドメインを生成する
    router.push(`/generated?name=${encodeURIComponent(trimmed)}`);
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
            autoFocus
          />
        </label>

        <button className="apply-button" type="submit" disabled={!valid}>
          覇気を放つ ⚡
        </button>

        <p className="apply-note">
          ※ いまは体験版。押すと <strong>{trimmed || '〇〇'}覇気全開</strong> ページが開きます。
        </p>
      </form>
    </main>
  );
}
