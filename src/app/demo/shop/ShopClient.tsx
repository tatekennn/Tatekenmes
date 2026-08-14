'use client';

import { useEffect, useState } from 'react';

const SESSION = 'haki_shop_session';

// 「正規の店」側。ログインすると自分のセッションIDを Cookie に持つ。
// evil.覇気.com が Domain=覇気.com で同名 Cookie を植えると、
// ここで読むセッションIDが攻撃者の値にすり替わる（Cookie tossing）。
function getCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export default function ShopClient() {
  const [session, setSession] = useState<string | null>(null);
  const [myId, setMyId] = useState<string>('');

  const refresh = () => setSession(getCookie(SESSION));

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 1000);
    return () => clearInterval(id);
  }, []);

  const login = () => {
    // 正規ログイン：自分だけのセッションID（host-only Cookie が理想だが、
    // ここでは "うっかり" 属性なしで発行＝tossing で上書きされ得る素の状態）
    const genId = `legit-${Math.floor(performance.now())}`;
    setMyId(genId);
    document.cookie = `${SESSION}=${genId}; path=/; max-age=3600`;
    refresh();
  };

  const tossed = session !== null && myId !== '' && session !== myId;

  return (
    <main className="demo-stage demo-shop">
      <p className="demo-kicker">正規サービス</p>
      <h1 className="demo-title">🛍 shop.覇気.com</h1>
      <p className="demo-lead">
        覇気ストアへようこそ。ログインすると、あなた専用のセッションで買い物ができます。
      </p>

      <button className="demo-btn demo-btn--primary" onClick={login} type="button">
        ログインする
      </button>

      <dl className="demo-view">
        <dt>あなたが発行したID</dt>
        <dd className="demo-mono">{myId || '(未ログイン)'}</dd>
        <dt>いま有効なセッションCookie</dt>
        <dd className="demo-mono">{session ?? '(なし)'}</dd>
      </dl>

      {tossed ? (
        <p className="demo-alert">
          ⚠️ セッションが乗っ取られています！ あなたが発行したのは <code>{myId}</code> なのに、
          実際に有効なのは <code>{session}</code>。これは evil.覇気.com が
          <code>Domain=覇気.com</code> で植えた Cookie です（Cookie tossing）。
        </p>
      ) : (
        <p className="demo-hint">
          この状態で <code>evil.覇気.com</code> を別タブで開き、「セッションを植える」を押すと、
          ここのセッションIDが攻撃者の値にすり替わります。
        </p>
      )}
    </main>
  );
}
