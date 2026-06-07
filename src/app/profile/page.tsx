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
    { label: '年齢', value: `${profile.age}歳` },
    { label: '活動', value: profile.job },
    { label: '拠点', value: `${profile.location}` },
  ];
  const traits = ['最近ハマった', 'プラトニック・プラネット派', '静かに熱い', '発見が好き', 'マイペース'];
  const timeline = [
    {
      title: 'Diary',
      body: 'まだ知らない曲に出会うたび、感じたことを日記に残しています。',
      href: '/diary',
    },
    {
      title: 'Latest',
      body: latestEntry ? latestEntry.title : '新しい記録が入ると、ここからも読めます。',
      href: latestEntry ? `/diary/${latestEntry.slug}` : '/diary',
    },
    {
      title: 'Home',
      body: 'トップでは日記、プロフィール、更新先をまとめています。',
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
          <p className="pop-home-hero__site">AMAGIRI MIO PROFILE</p>
          <p className="eyebrow">Profile</p>
          <h1>{profile.name}</h1>
          <p className="pop-profile-hero__ruby">{profile.ruby}</p>
          <p className="pop-profile-hero__tagline">最近Juice=Juiceにハマりました。まだ知らない曲だらけです。</p>
          <p className="pop-profile-hero__summary">知らない曲に出会うたびに、ここに書いていきたいです。まずは曲とMVを知るところから、少しずつ。</p>
          <div className="pop-profile-hero__actions">
            <Link className="pill-button" href="/diary">日記を読む</Link>
            <Link className="official-text-link" href="/">Home →</Link>
          </div>
        </div>
      </section>

      <section className="pop-profile-facts" aria-labelledby="profile-facts-title">
        <div className="pop-section-heading pop-section-heading--news">
          <span aria-hidden="true">ABOUT</span>
          <p className="eyebrow">About</p>
          <h2 id="profile-facts-title">澪について</h2>
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
          <p>プロフィールで気になったら、日記へ。日々の発見のほうが、たぶんいちばん澪らしいです。</p>
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

      <section className="pop-profile-tags" aria-label="天霧澪の雰囲気">
        {traits.map((trait) => (
          <span key={trait}>{trait}</span>
        ))}
      </section>
    </SiteShell>
  );
}
