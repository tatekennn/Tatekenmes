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
  const traits = ['静か', '落ち着いている', '話し方はやわらかめ', '雑談中心', 'マイペース'];
  const timeline = [
    {
      title: '配信',
      body: '雑談を中心に、その日あったことや最近気になっていることを、落ち着いたテンポで話しています。気負わず見に来てもらえる配信にしたいです。',
    },
    {
      title: '日記',
      body: '配信では話しきれなかったことや、あとで見返したいことは日記にまとめています。長すぎず、でもちゃんと残る形にしておきたいと思っています。',
    },
    {
      title: 'このサイト',
      body: 'お知らせ、配信、日記をひとつにまとめて、気になったときにふらっと見に来てもらえる場所にしたくて作っています。',
    },
  ];

  return (
    <SiteShell variant="home">
      <section className="talent-hero">
        <div className="talent-hero__backdrop" style={{ backgroundImage: `url(${assets.profileFull.src})` }} />
        <div className="talent-hero__glow talent-hero__glow--one" aria-hidden="true" />
        <div className="talent-hero__glow talent-hero__glow--two" aria-hidden="true" />

        <div className="talent-hero__grid">
          <div className="talent-hero__figure-column">
            <div className="talent-hero__figure-card">
              <div className="talent-hero__figure-frame" aria-hidden="true" />
              <img className="talent-hero__figure-image" src={assets.profileFull.src} alt={assets.profileFull.alt} />
              <div className="talent-hero__figure-note">
                <strong>{profile.name}</strong>
                <span>雑談配信と日記を、自分のペースで続けています。</span>
              </div>
            </div>
          </div>

          <div className="talent-hero__copy-column">
            <section className="talent-logo-panel">
              <p className="eyebrow">Profile</p>
              <p className="talent-logo-panel__ruby">AMAGIRI MIO / VTUBER / DIARY & STREAM</p>
              <h1>{profile.name}</h1>
              <p className="talent-logo-panel__tagline">ゆっくり話して、ゆっくり残していくタイプです。</p>
              <p className="talent-logo-panel__summary">{profile.bio[1]}</p>
              <div className="talent-logo-panel__chips">
                {traits.slice(0, 4).map((trait) => (
                  <span key={trait}>{trait}</span>
                ))}
              </div>
              <p className="talent-logo-panel__quote">配信も日記も、あとから見返しやすい形で残していきたいです。</p>
            </section>

            <section className="talent-meta-panel">
              <div className="talent-meta-panel__lead">
                <h2>基本情報</h2>
                <p>まずは、どんな感じで活動しているかが自然に伝わるくらいの情報だけ置いています。</p>
              </div>
              <dl className="talent-meta-grid">
                {facts.map((fact) => (
                  <div key={fact.label} className="talent-meta-grid__item">
                    <dt>{fact.label}</dt>
                    <dd>{fact.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>
        </div>

        <div className="hero-link-strip">
          <Link className="hero-link-card" href="/diary">
            <p className="eyebrow">Diary</p>
            <div>
              <strong>日記を読む</strong>
              <p>配信では話しきれなかったことも、ここに少しずつまとめています。</p>
            </div>
            <span>→</span>
          </Link>
          {latestEntry ? (
            <Link className="hero-link-card" href={`/diary/${latestEntry.slug}`}>
              <p className="eyebrow">Latest</p>
              <div>
                <strong>{latestEntry.title}</strong>
                <p>いちばん新しい更新はこちらから読めます。</p>
              </div>
              <span>→</span>
            </Link>
          ) : null}
          <Link className="hero-link-card" href="/">
            <p className="eyebrow">Home</p>
            <div>
              <strong>ホームへ戻る</strong>
              <p>更新先や配信導線をまとめて見たいときはこちらへ。</p>
            </div>
            <span>→</span>
          </Link>
        </div>
      </section>

      <section className="archive-landing">
        <section className="archive-landing__panel">
          <div className="archive-landing__intro">
            <p className="eyebrow">Activity</p>
            <h2>この場所について</h2>
          </div>
          <div className="stack-list">
            {timeline.map((item) => (
              <article key={item.title} className="stack-item">
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="archive-landing__panel archive-landing__panel--profile-light">
          <div className="archive-landing__intro">
            <p className="eyebrow">Mood</p>
            <h2>ふだんの印象</h2>
            <p>にぎやかすぎるより、落ち着いて話せる空気のほうが好きです。ゆっくり見てもらえたら、それがいちばんうれしいです。</p>
          </div>
          <ul className="tag-list">
            {traits.map((trait) => (
              <li key={trait}>{trait}</li>
            ))}
          </ul>
        </section>
      </section>
    </SiteShell>
  );
}
