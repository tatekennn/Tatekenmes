import Link from 'next/link';
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

const showcaseLinks = [
  {
    eyebrow: 'Diary',
    title: '最近の日記をひらく',
    description: '勤務終わりの空気と、小さな違和感の記録。',
    href: '/diary',
    imageKey: 'diaryHeader',
  },
  {
    eyebrow: 'Profile',
    title: '天霧 澪の輪郭',
    description: '昼の顔と夜の観測、そのあいだにある生活。',
    href: '/profile',
    imageKey: 'heroMain',
  },
  {
    eyebrow: 'World',
    title: '街に残る微かな異界',
    description: '窓、雨、終電前のホームにだけ残る気配。',
    href: '/world',
    imageKey: 'diaryDecor',
  },
] as const;

export default function HomePage() {
  const latestEntries = getLatestDiaryEntries(3);
  const profile = siteData.profile;
  const featuredQuote = siteData.featuredQuote;
  const summary = profile.bio[0];
  const profileFacts = siteData.quickFacts;
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

            <div className="talent-meta-panel talent-meta-panel--compact">
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

      <section className="showcase-triptych" aria-label="拡張導線">
        {showcaseLinks.map((item) => {
          const asset = assets[item.imageKey];
          return (
            <Link
              key={item.href}
              className={`showcase-triptych__card showcase-triptych__card--${item.imageKey}`}
              href={item.href}
            >
              <div className="showcase-triptych__image" style={{ backgroundImage: `url(${asset.src})` }} />
              <div className="showcase-triptych__veil" />
              <div className="showcase-triptych__copy">
                <p className="eyebrow">{item.eyebrow}</p>
                <h2>{item.title}</h2>
                <p>{item.description}</p>
                <span>view archive ↗</span>
              </div>
            </Link>
          );
        })}
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
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <SectionCard title="まだ記録がありません">
            <p>content/diary に記録が追加されると、ここに表示されます。</p>
          </SectionCard>
        )}
      </section>

      <section className="cinematic-band" style={{ backgroundImage: `url(${assets.diaryDecor.src})` }}>
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
            <Link className="inline-link" href="/profile">
              澪の輪郭をみる →
            </Link>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
