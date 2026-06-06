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
    { label: '仕事', value: profile.job },
    { label: '居住圏', value: `${profile.location} / 一人暮らし` },
  ];
  const traits = ['静か', '落ち着いている', '話し方はやわらかめ', '感情を大きく出しすぎない', '仕事は丁寧'];
  const timeline = [
    {
      title: '平日の昼',
      body: '平日は都内のIT企業で、総務や業務管理に近い事務仕事をしています。会議室や備品や申請や、細かな数字がちゃんと流れるように見ていることが多いです。',
    },
    {
      title: '退勤後',
      body: 'まっすぐ帰る日もありますし、少し気分を切り替えたくて寄り道する日もあります。帰り道で気になったことは、あとで思い出せるように軽くメモしています。',
    },
    {
      title: '記録する理由',
      body: 'あとから振り返ったときに、その日のことをちゃんと思い出せるようにしておきたいからです。大げさに書くというより、自分の中で整理するために残しています。',
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
                <span>平日は事務の仕事。帰り道やその日のことを、あとから思い出せる形で残しています。</span>
              </div>
            </div>
          </div>

          <div className="talent-hero__copy-column">
            <section className="talent-logo-panel">
              <p className="eyebrow">Profile</p>
              <p className="talent-logo-panel__ruby">AMAGIRI MIO / OFFICE WORKER / QUIET RECORDS</p>
              <h1>{profile.name}</h1>
              <p className="talent-logo-panel__tagline">仕事の延長にある生活と、その日に残したいと思ったこと。</p>
              <p className="talent-logo-panel__summary">{profile.bio[1]}</p>
              <div className="talent-logo-panel__chips">
                {traits.slice(0, 4).map((trait) => (
                  <span key={trait}>{trait}</span>
                ))}
              </div>
              <p className="talent-logo-panel__quote">日記も配信も、少し落ち着いて見返せる場所にしたいと思っています。</p>
            </section>

            <section className="talent-meta-panel">
              <div className="talent-meta-panel__lead">
                <h2>基本情報</h2>
                <p>派手な設定を見せるより、普段どんな人かが自然に伝わるくらいの整理にしています。</p>
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
              <p>仕事のあとや帰宅後に書いた記録をまとめています。</p>
            </div>
            <span>→</span>
          </Link>
          {latestEntry ? (
            <Link className="hero-link-card" href={`/diary/${latestEntry.slug}`}>
              <p className="eyebrow">Latest</p>
              <div>
                <strong>{latestEntry.title}</strong>
                <p>最新の日記から、最近の空気感をそのまま読めます。</p>
              </div>
              <span>→</span>
            </Link>
          ) : null}
          <Link className="hero-link-card" href="/">
            <p className="eyebrow">Home</p>
            <div>
              <strong>ホームへ戻る</strong>
              <p>サイト全体の入口に戻って、更新先や配信導線も確認できます。</p>
            </div>
            <span>→</span>
          </Link>
        </div>
      </section>

      <section className="archive-landing">
        <section className="archive-landing__panel">
          <div className="archive-landing__intro">
            <p className="eyebrow">Weekday outline</p>
            <h2>普段の流れ</h2>
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
            <p className="eyebrow">Temperament</p>
            <h2>ふだんの印象</h2>
            <p>人前で大きく感情を動かすタイプではありませんが、必要なことは丁寧に整えておきたいほうです。</p>
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
