import Link from 'next/link';
import { SiteShell } from '@/components/site-shell';
import { siteData } from '@/content/site-data';
import { getLatestDiaryEntries } from '@/lib/diary';

export const metadata = {
  title: 'プロフィール | 天霧 澪',
};

export default function ProfilePage() {
  const profile = siteData.profile;
  const assets = siteData.generatedAssets;
  const latestEntry = getLatestDiaryEntries(1)[0];
  const facts = [
    { label: '名前', value: `${profile.name}（${profile.ruby}）` },
    { label: '役割', value: profile.job },
    { label: '拠点', value: `${profile.location}` },
    { label: '発信', value: 'X短文 / 調査メモ' },
  ];
  const traits = ['ファンを増やす', '公式確認重視', '入口を作る', '短く届ける', '少し深掘り'];
  const timeline = [
    {
      title: 'Memo',
      body: '公式情報やメンバーの魅力を、初めて見る人にも届くメモに整えます。',
      href: '/diary',
    },
    {
      title: 'Latest',
      body: latestEntry ? latestEntry.title : '新しい調査メモが入ると、ここからも読めます。',
      href: latestEntry ? `/diary/${latestEntry.slug}` : '/diary',
    },
    {
      title: 'Home',
      body: 'トップでは新しいメモ、発信方針、Xへの導線をまとめています。',
      href: '/',
    },
  ];

  return (
    <SiteShell variant="home">
      <section className="pop-profile-hero" aria-label="天霧澪 プロフィール">
        <div className="pop-profile-hero__decor" aria-hidden="true">
          <span>PROFILE</span>
          <i>✦</i>
          <b>♪</b>
        </div>
        <div className="pop-profile-hero__figure" aria-hidden="true">
          <img src={assets.profileFull.src} alt="" />
        </div>
        <div className="pop-profile-hero__copy">
          <p className="pop-home-hero__site">AMAGIRI MIO GUIDE PROFILE</p>
          <p className="eyebrow">Profile</p>
          <h1>{profile.name}</h1>
          <p className="pop-profile-hero__ruby">{profile.ruby}</p>
          <p className="pop-profile-hero__tagline">Juice=Juiceの魅力を、まだ知らない人へ届ける案内係です。</p>
          <p className="pop-profile-hero__summary">公式情報を確認しながら、メンバー・楽曲・ニュースの入口を短くわかりやすく整えます。目標は、好きになるきっかけを一つ増やすこと。</p>
          <div className="pop-profile-hero__actions">
            <Link className="pill-button" href="/diary">調査メモを読む</Link>
            <Link className="official-text-link" href="/">Home →</Link>
          </div>
        </div>
      </section>

      <section className="pop-profile-facts" aria-labelledby="profile-facts-title">
        <div className="pop-section-heading pop-section-heading--news">
          <span aria-hidden="true">ABOUT</span>
          <p className="eyebrow">About</p>
          <h2 id="profile-facts-title">澪の発信方針</h2>
        </div>
        <dl className="pop-profile-facts__grid">
          {facts.map((fact) => (
            <div key={fact.label}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="pop-profile-route" aria-labelledby="profile-route-title">
        <div>
          <p className="eyebrow">Route</p>
          <h2 id="profile-route-title">ここから読めます</h2>
          <p>ファンを増やすために、まずは覚えやすい入口から。短い要点と、少し詳しい読み物の両方を置いていきます。</p>
        </div>
        <div className="pop-profile-route__list">
          {timeline.map((item) => (
            <Link key={item.title} href={item.href}>
              <span>{item.title}</span>
              <strong>{item.body}</strong>
            </Link>
          ))}
        </div>
      </section>

      <section className="pop-profile-tags" aria-label="天霧澪の活動タグ">
        {traits.map((trait) => (
          <span key={trait}>{trait}</span>
        ))}
      </section>
    </SiteShell>
  );
}
