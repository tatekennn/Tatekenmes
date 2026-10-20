import type { Metadata } from 'next';
import Link from 'next/link';

const TITLE = '広告募集 | 覇気.com';
const DESCRIPTION =
  '覇気.com のサブドメインが広告枠になります。「あなたの名前.覇気.com」で、覇気たっぷりにあなたのサービスを見せませんか。';
const URL = 'https://xn--4rrt1v.xn--7qwx14d.com';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: URL, siteName: '覇気.com', locale: 'ja_JP', type: 'website' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
};

const CONTACT_URL = 'https://github.com/tatekennn/Tatekenmes/issues/new?title=%E5%BA%83%E5%91%8A%E6%9E%A0%E3%81%AE%E7%94%B3%E3%81%97%E8%BE%BC%E3%81%BF';

// 実際に稼働している掲載例（表示名と punycode ホスト）
const EXAMPLES: { label: string; host: string }[] = [
  { label: 'たてけんの.覇気.com', host: 'xn--08j1av7a2n.xn--7qwx14d.com' },
  { label: 'ペパボの.覇気.com', host: 'xn--u9j1k0aj.xn--7qwx14d.com' },
  { label: 'tukki.覇気.com', host: 'tukki.xn--7qwx14d.com' },
];

const PLANS = [
  {
    name: '覇気',
    price: '応相談',
    body: '「あなたの名前の.覇気.com」を1枠。中身はこちらの覇気ページに名前を差し込んだもの。',
  },
  {
    name: '覇気全開',
    price: '応相談',
    body: 'サブドメインの中身を丸ごとお任せ。好きなページ・好きな動き・好きな覇気。',
  },
  {
    name: '覇王色',
    price: '応相談',
    body: '覇気.com のトップページにあなたの名前を載せる。見た人全員が覇気を受ける。',
  },
];

const FAQ = [
  ['広告って何を出せるの？', 'テキスト・画像・リンク・3D空間、覇気があれば何でも。公序良俗に反するものと、他人になりすますものはお断りします。'],
  ['日本語のサブドメインは使える？', '使えます。「ペパボの.覇気.com」のように日本語ラベルで発行できます（punycode 変換は自前実装）。'],
  ['表示までどれくらいかかる？', 'DNS レコード作成と証明書発行を合わせて、だいたい 20 秒くらいです。'],
  ['本当に募集してるの？', '本当です。覇気があれば。'],
];

export default function AdPage() {
  return (
    <main className="ad-page">
      <header className="ad-hero">
        <p className="ad-kicker">覇気.com 広告枠</p>
        <h1 className="ad-title">
          あなたの名前を、
          <br />
          <span className="ad-title-accent">覇気.com のサブドメイン</span>に。
        </h1>
        <p className="ad-lead">
          覇気.com では、サブドメインを広告枠として提供しています。「<strong>あなたの名前の.覇気.com</strong>」が、そのままあなたの広告になります。
        </p>
        <div className="ad-hero-actions">
          <a className="ad-button ad-button--primary" href={CONTACT_URL} target="_blank" rel="noopener noreferrer">
            広告枠を申し込む
          </a>
          <a className="ad-button" href="#examples">
            掲載例を見る
          </a>
        </div>
        <p className="ad-availability">
          <span className="ad-dot" aria-hidden="true" />
          現在募集中
        </p>
      </header>

      <section className="ad-section" id="examples" aria-labelledby="ad-examples-heading">
        <h2 className="ad-heading" id="ad-examples-heading">
          掲載例
        </h2>
        <p className="ad-note">すでに覇気を放っているサブドメインたちです。どれも本物の URL です。</p>
        <ul className="ad-examples">
          {EXAMPLES.map((ex) => (
            <li key={ex.host}>
              <a className="ad-example" href={`https://${ex.host}/`} target="_blank" rel="noopener noreferrer">
                <span className="ad-example-label">{ex.label}</span>
                <span className="ad-example-arrow" aria-hidden="true">
                  →
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="ad-section" aria-labelledby="ad-plans-heading">
        <h2 className="ad-heading" id="ad-plans-heading">
          プラン
        </h2>
        <div className="ad-plans">
          {PLANS.map((plan) => (
            <article className="ad-plan" key={plan.name}>
              <h3 className="ad-plan-name">{plan.name}</h3>
              <p className="ad-plan-price">{plan.price}</p>
              <p className="ad-plan-body">{plan.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="ad-section" aria-labelledby="ad-spec-heading">
        <h2 className="ad-heading" id="ad-spec-heading">
          枠の仕様
        </h2>
        <dl className="ad-spec">
          <div>
            <dt>形式</dt>
            <dd>サブドメイン 1 つ（例: shop.覇気.com / お店の.覇気.com）</dd>
          </div>
          <div>
            <dt>文字</dt>
            <dd>英数字・日本語どちらも可、20 文字まで</dd>
          </div>
          <div>
            <dt>配信</dt>
            <dd>HTTPS 対応、証明書は自動発行</dd>
          </div>
          <div>
            <dt>掲載期間</dt>
            <dd>覇気が続く限り</dd>
          </div>
        </dl>
      </section>

      <section className="ad-section" aria-labelledby="ad-faq-heading">
        <h2 className="ad-heading" id="ad-faq-heading">
          よくある質問
        </h2>
        <div className="ad-faq">
          {FAQ.map(([q, a]) => (
            <details className="ad-faq-item" key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="ad-section ad-cta" aria-labelledby="ad-cta-heading">
        <h2 className="ad-heading" id="ad-cta-heading">
          申し込み
        </h2>
        <p className="ad-note">
          希望するサブドメイン名と、載せたい内容を添えてご連絡ください。覇気を持ってお返事します。
        </p>
        <a className="ad-button ad-button--primary" href={CONTACT_URL} target="_blank" rel="noopener noreferrer">
          広告枠を申し込む
        </a>
      </section>

      <footer className="ad-footer">
        <Link href="https://xn--7qwx14d.com/">覇気.com へ戻る</Link>
      </footer>
    </main>
  );
}
