import Link from 'next/link';
import { DiaryCard } from '@/components/diary-card';
import { SectionCard } from '@/components/section-card';
import { SiteShell } from '@/components/site-shell';
import { formatMoodLabel, getLatestDiaryEntries, type DiaryEntry } from '@/lib/diary';
import { siteData } from '@/content/site-data';

const heroLinks = [
  {
    eyebrow: 'Diary',
    title: '最新の日記をひらく',
    description: '勤務終わりの空気と、小さな違和感の記録をまとめています。',
    href: '/diary',
  },
  {
    eyebrow: 'Profile',
    title: '天霧 澪の輪郭',
    description: '昼の顔と夜の観測、そのあいだにある生活の質感を案内します。',
    href: '/profile',
  },
  {
    eyebrow: 'World',
    title: '街に残る微かな異界',
    description: '窓、雨、終電前のホームにだけ残る気配を静かに集めています。',
    href: '/world',
  },
] as const;

const visualHighlights = [
  {
    title: 'メインビジュアル',
    note: '夜のオフィス / 都市の光 / 観測の視線',
    image: siteData.generatedAssets.heroMain.src,
  },
  {
    title: '日記ヘッダー',
    note: '一覧導入 / 机上の余白 / 生活の温度',
    image: siteData.generatedAssets.diaryHeader.src,
  },
  {
    title: '装飾背景',
    note: 'ノート / ランプ / 淡い記号性',
    image: siteData.generatedAssets.diaryDecor.src,
  },
] as const;

export default function HomePage() {
  const latestEntries = getLatestDiaryEntries(3);
  const profile = siteData.profile;
  const featuredQuote = siteData.featuredQuote;
  const summary = profile.bio[0];
  const profileFacts = siteData.quickFacts;
  const worldFragments = siteData.worldFragments.slice(0, 3);
  const assets = siteData.generatedAssets;
  const featuredEntry = latestEntries[0];
  const recentEntries = latestEntries.slice(1);

  return (
    <SiteShell>
      <section className="talent-hero">
        <div className="talent-hero__backdrop" style={{ backgroundImage: `url(${assets.heroMain.src})` }} />
        <div className="talent-hero__glow talent-hero__glow--one" />
        <div className="talent-hero__glow talent-hero__glow--two" />

        <div className="talent-hero__grid">
          <div className="talent-hero__figure-column">
            <div className="talent-hero__figure-card">
              <div className="talent-hero__figure-frame" />
              <img className="talent-hero__figure-image" src={assets.profileFull.src} alt={assets.profileFull.alt} />
              <div className="talent-hero__figure-note">
                <p className="eyebrow">Visual identity</p>
                <strong>office worker / subtle nocturne</strong>
                <span>会社員の輪郭を保ったまま、夜だけ少し異界が混ざる設計です。</span>
              </div>
            </div>
          </div>

          <div className="talent-hero__copy-column">
            <div className="talent-logo-panel">
              <p className="eyebrow">AMAGIRI MIO OFFICIAL SITE</p>
              <p className="talent-logo-panel__ruby">{profile.ruby} / AMAGIRI MIO</p>
              <h1>{profile.name}</h1>
              <p className="talent-logo-panel__tagline">昼は整える人、夜は街を観測する人。</p>
              <p className="talent-logo-panel__summary">{summary}</p>
              <div className="talent-logo-panel__chips" aria-label="世界観の比率">
                <span>Tokyo office</span>
                <span>Reality {profile.worldRatio.reality}%</span>
                <span>Occult {profile.worldRatio.occult}%</span>
              </div>
              <blockquote className="talent-logo-panel__quote">「{featuredQuote}」</blockquote>

              <div className="hero-actions">
                <Link className="pill-button" href="/diary">
                  最新の日記を見る
                </Link>
                <Link className="pill-button secondary" href="/profile">
                  プロフィールへ
                </Link>
              </div>
            </div>

            <div className="talent-meta-panel">
              <div className="talent-meta-panel__lead">
                <p className="eyebrow">Character note</p>
                <h2>静かな事務職と、夜の観測記録。</h2>
                <p>
                  派手なホラーではなく、平日の延長にだけ現れる違和感を拾う。その温度差ごと、ひとつの個人VTuberサイトとして見せる構成です。
                </p>
              </div>
              <dl className="talent-meta-grid">
                {profileFacts.map((fact) => (
                  <div key={fact.label} className="talent-meta-grid__item">
                    <dt>{fact.label}</dt>
                    <dd>{fact.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>

        <div className="hero-link-strip" role="navigation" aria-label="主要導線">
          {heroLinks.map((item) => (
            <Link key={item.href} className="hero-link-card" href={item.href}>
              <p className="eyebrow">{item.eyebrow}</p>
              <strong>{item.title}</strong>
              <p>{item.description}</p>
              <span aria-hidden="true">↗</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="illustration-stage illustration-stage--wide">
        <div className="illustration-stage__paper" style={{ backgroundImage: `url(${assets.diaryDecor.src})` }} />
        <div className="illustration-stage__intro section-heading">
          <div>
            <p className="eyebrow">Scene design</p>
            <h2>背景にも、澪の気配を置く。</h2>
            <p>
              参考にしたVTuberサイトのように、情報だけでなくイラストそのものを空間として使います。カードを並べるより先に、ひとつの世界として見えることを優先しています。
            </p>
          </div>
        </div>

        <div className="illustration-stage__grid illustration-stage__grid--wide">
          <article className="statement-card statement-card--heroic">
            <p className="eyebrow">Message</p>
            <h3>あなたの生活圏から、少しだけ外れた場所を一緒に見る。</h3>
            <p>{profile.bio[1]}</p>
            <p>{profile.bio[2]}</p>
          </article>

          <div className="fragment-rail">
            {worldFragments.map((fragment, index) => (
              <article key={fragment.title} className={`fragment-rail__item fragment-rail__item--${index + 1}`}>
                <p className="eyebrow">Fragment</p>
                <h3>{fragment.title}</h3>
                <p>{fragment.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="visual-band section-block">
        <div className="section-heading section-intro">
          <div>
            <p className="eyebrow">Visual pickup</p>
            <h2>ビジュアルを、説明ではなく演出に使う。</h2>
            <p>
              ただ画像を並べるのではなく、トップの空気・日記の入口・背景の余白という役割ごとに置き方を変えています。ここは制作資料ではなく、サイトの見せ場として扱います。
            </p>
          </div>
        </div>

        <div className="visual-band__grid">
          {visualHighlights.map((visual, index) => (
            <article key={visual.title} className={`visual-band__card visual-band__card--${index + 1}`}>
              <img src={visual.image} alt={`${profile.name} visual: ${visual.title}`} />
              <div className="visual-band__copy">
                <p className="eyebrow">visual {index + 1}</p>
                <h3>{visual.title}</h3>
                <p>{visual.note}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="cinematic-band" style={{ backgroundImage: `url(${assets.heroMain.src})` }}>
        <div className="cinematic-band__veil" />
        <div className="cinematic-band__content">
          <p className="eyebrow">Nocturne signal</p>
          <h2>退勤後の街は、少しだけ観測対象になる。</h2>
          <p>
            窓に映る自分、ホームに残る湿度、誰も気に留めない数秒のずれ。澪のサイトは、その小さな差分だけを丁寧に拾うための個人アーカイブです。
          </p>
          <div className="cinematic-band__actions">
            <Link className="inline-link" href="/world">
              世界観を辿る →
            </Link>
            <Link className="inline-link" href="/diary">
              日記へ入る →
            </Link>
          </div>
        </div>
      </section>

      <section className="diary-stage diary-stage--featured">
        <div className="diary-stage__backdrop" style={{ backgroundImage: `url(${assets.diaryHeader.src})` }} />
        <div className="section-heading section-intro diary-stage__heading">
          <div>
            <p className="eyebrow">Diary pickup</p>
            <h2>最近の日記</h2>
            <p>トップは世界観の入口、日記は体温の入口です。最新の記録のうち一編を大きく見せ、残りは静かに並べます。</p>
          </div>
          <Link className="pill-button secondary" href="/diary">
            一覧を見る
          </Link>
        </div>

        {featuredEntry ? (
          <div className="diary-feature-layout">
            <article className="diary-feature-main">
              <p className="eyebrow">Featured entry</p>
              <div className="diary-card__meta">
                <span>{featuredEntry.date}</span>
                <span>{formatMoodLabel(featuredEntry.mood)}</span>
              </div>
              <h3>{featuredEntry.title}</h3>
              <p className="diary-feature-main__excerpt">{featuredEntry.excerpt}</p>
              <div className="tag-row">
                {featuredEntry.tags.map((tag) => (
                  <span key={tag} className="tag-pill">
                    {tag}
                  </span>
                ))}
              </div>
              <Link className="inline-link" href={`/diary/${featuredEntry.slug}`}>
                記録を読む →
              </Link>
            </article>
            <div className="diary-feature-side" aria-label="ほかの記録">
              <p className="eyebrow diary-feature-side__label">Recent notes</p>
              {recentEntries.map((entry: DiaryEntry) => (
                <Link key={entry.slug} className="diary-rail-link" href={`/diary/${entry.slug}`}>
                  <div className="diary-card__meta">
                    <span>{entry.date}</span>
                    <span>{formatMoodLabel(entry.mood)}</span>
                  </div>
                  <strong>{entry.title}</strong>
                  <p>{entry.tags.slice(0, 2).join(' / ')}</p>
                </Link>)
              )}
            </div>
          </div>
        ) : (
          <SectionCard title="まだ記録がありません">
            <p>content/diary に記録が追加されると、ここに表示されます。</p>
          </SectionCard>
        )}
      </section>

      <section className="archive-landing">
        <div className="archive-landing__panel archive-landing__panel--profile archive-landing__panel--profile-light">
          <div className="archive-landing__intro">
            <p className="eyebrow">Profile</p>
            <h2>澪の横顔</h2>
            <p>肩上のやわらかな表情と、平日の延長にある静けさ。人物の輪郭を最短でつかむための入口です。</p>
          </div>
          <div className="archive-landing__profile">
            <img className="profile-inline__icon" src={assets.profileIcon.src} alt={assets.profileIcon.alt} />
            <dl className="detail-list">
              {profileFacts.map((fact) => (
                <div key={fact.label} className="detail-row">
                  <dt>{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <div className="archive-landing__panel archive-landing__panel--guide archive-landing__panel--guide-light">
          <div className="archive-landing__intro">
            <p className="eyebrow">Guide</p>
            <h2>入口の案内</h2>
            <p>読む順番を決めなくても、気になる温度から入れるようにしています。</p>
          </div>
          <div className="archive-guide-links">
            <Link className="archive-guide-link" href="/diary">
              <strong>日記</strong>
              <span>毎日の静けさと違和感を、いちばん素直な温度で追える場所です。</span>
              <em>日記一覧へ →</em>
            </Link>
            <Link className="archive-guide-link" href="/profile">
              <strong>プロフィール</strong>
              <span>人物の輪郭を先に知りたいならこちらから。</span>
              <em>プロフィールへ →</em>
            </Link>
            <Link className="archive-guide-link" href="/world">
              <strong>世界観</strong>
              <span>夜の街にだけ残る気配を、断片ごとに辿れます。</span>
              <em>世界観へ →</em>
            </Link>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
