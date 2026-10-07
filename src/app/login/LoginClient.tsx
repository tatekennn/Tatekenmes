'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

type User = { id: string; email: string };

export default function LoginClient() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/local-auth', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => setUser(data?.user ?? null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage(mode === 'register' ? 'アカウントを作成中…' : 'ログイン中…');
    try {
      const res = await fetch('/api/local-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: mode, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'ログインに失敗しました');
      setUser(data.user);
      setMessage(mode === 'register' ? '登録してログインしました' : 'ログインしました');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'ログインに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    await fetch('/api/local-auth', { method: 'DELETE' });
    setUser(null);
    setMessage('ログアウトしました');
    setLoading(false);
  };

  return (
    <main className="apply-stage">
      <div className="aura aura-one" />
      <div className="aura aura-two" />
      <section className="apply-card" aria-labelledby="login-title">
        <div className="demo-badge">無料アカウント</div>
        <p className="apply-kicker">OWNER LOGIN</p>
        <h1 className="apply-title" id="login-title">{mode === 'register' ? '無料登録' : 'ログイン'}</h1>
        <p className="apply-lead">メールアドレスとパスワードで、あなたの区画を管理します。</p>

        {user ? (
          <div className="success-panel">
            <div className="success-mark" aria-hidden="true">✓</div>
            <h2>ログイン中</h2>
            <p><strong>{user.email}</strong></p>
            <a className="apply-button apply-button--link" href="/apply">サブドメインを選ぶ</a>
            <a className="apply-button apply-button--secondary" href="/dashboard">DNS管理画面へ</a>
            <button className="text-button" type="button" onClick={logout} disabled={loading}>ログアウト</button>
          </div>
        ) : (
          <form onSubmit={login}>
            <label className="apply-field">
              <span className="apply-label">メールアドレス</span>
              <input
                className="apply-input"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                autoFocus
              />
            </label>
            <label className="apply-field">
              <span className="apply-label">パスワード（8文字以上）</span>
              <input
                className="apply-input"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                minLength={8}
                maxLength={128}
                required
              />
            </label>
            <button className="apply-button" type="submit" disabled={loading || !email.trim() || password.length < 8}>
              {loading ? '確認中…' : mode === 'register' ? '無料登録する' : 'ログイン'}
            </button>
            <button
              className="text-button"
              type="button"
              onClick={() => { setMode((current) => current === 'register' ? 'login' : 'register'); setMessage(''); }}
              disabled={loading}
            >
              {mode === 'register' ? '登録済みの方はこちら' : '初めての方はこちら'}
            </button>
          </form>
        )}
        {message && <p className="apply-status">{message}</p>}
        <p className="apply-note">パスワードは復元できない形式でハッシュ化して保存します。</p>
      </section>
    </main>
  );
}
