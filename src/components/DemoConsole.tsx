'use client';

import { useEffect, useState } from 'react';

// LT デモ用の共通コンソール。localStorage と Cookie の「今の見え方」を
// このサブドメイン(origin)から観測し、書き込みボタンも提供する。
// 同じ覇気.com の別サブドメインを別タブで開いて、値が共有されるか/されないかを見る。

const STORE_KEY = 'haki_demo_note';
const COOKIE_NAME = 'haki_demo_cookie';

function readCookies(): string {
  if (typeof document === 'undefined') return '';
  return document.cookie || '(なし)';
}

export default function DemoConsole({ zoneCookieDomain }: { zoneCookieDomain?: string }) {
  const [ls, setLs] = useState<string>('');
  const [cookies, setCookies] = useState<string>('');
  const [input, setInput] = useState<string>('');

  const refresh = () => {
    try {
      setLs(localStorage.getItem(STORE_KEY) ?? '(なし)');
    } catch {
      setLs('(アクセス不可)');
    }
    setCookies(readCookies());
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 1000); // 別タブの変化も拾えるよう定期更新
    return () => clearInterval(id);
  }, []);

  const writeLs = () => {
    localStorage.setItem(STORE_KEY, input || `${location.hostname} が書いた`);
    refresh();
  };

  const writeHostCookie = () => {
    // host-only Cookie（Domain 指定なし）＝このサブドメインだけに閉じる
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(input || location.hostname)}; path=/; max-age=3600`;
    refresh();
  };

  const writeDomainCookie = () => {
    // Domain 指定 Cookie ＝ 覇気.com 配下の全サブドメインに漏れる
    const domain = zoneCookieDomain ? `; domain=${zoneCookieDomain}` : '';
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(input || location.hostname)}${domain}; path=/; max-age=3600`;
    refresh();
  };

  const clearAll = () => {
    try {
      localStorage.removeItem(STORE_KEY);
    } catch {
      /* noop */
    }
    document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
    if (zoneCookieDomain) {
      document.cookie = `${COOKIE_NAME}=; domain=${zoneCookieDomain}; path=/; max-age=0`;
    }
    refresh();
  };

  return (
    <div className="demo-console">
      <div className="demo-row">
        <input
          className="demo-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="書き込む値（省略可）"
        />
        <button className="demo-btn" onClick={refresh} type="button">
          🔄 再読込
        </button>
      </div>

      <div className="demo-actions">
        <button className="demo-btn" onClick={writeLs} type="button">
          localStorage に書く
        </button>
        <button className="demo-btn" onClick={writeHostCookie} type="button">
          Cookie（このサブドメイン限定）
        </button>
        <button className="demo-btn demo-btn--warn" onClick={writeDomainCookie} type="button">
          Cookie（Domain=覇気.com で共有）
        </button>
        <button className="demo-btn demo-btn--ghost" onClick={clearAll} type="button">
          消す
        </button>
      </div>

      <dl className="demo-view">
        <dt>localStorage[{STORE_KEY}]</dt>
        <dd className="demo-mono">{ls}</dd>
        <dt>document.cookie</dt>
        <dd className="demo-mono">{cookies}</dd>
        <dt>origin</dt>
        <dd className="demo-mono">
          {typeof window !== 'undefined' ? window.location.origin : ''}
        </dd>
      </dl>
    </div>
  );
}
