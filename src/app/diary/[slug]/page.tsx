import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteShell } from '@/components/site-shell';
import { siteData } from '@/content/site-data';
import { formatMoodLabel, getDiaryEntries, getDiaryEntryBySlug, type DiaryEntry } from '@/lib/diary';

export async function generateStaticParams() {
  return getDiaryEntries().map((entry: DiaryEntry) => ({ slug: entry.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = getDiaryEntryBySlug(slug);

  return {
    title: entry ? `${entry.title} | 天霧 澪` : 'リサーチガイド | 天霧 澪',
    description: entry?.excerpt ?? '天霧澪のJuice=Juiceリサーチガイド',
  };
}

export default async function DiaryEntryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = getDiaryEntryBySlug(slug);

  if (!entry) {
    notFound();
  }

  const entries = getDiaryEntries();
  const relatedEntries = entries.filter((item) => item.slug !== entry.slug).slice(0, 4);
  const assets = siteData.generatedAssets;

  return (
    <SiteShell variant="home" activeHref="/diary">
      <section className="diary-stage diary-stage--featured">
        <div className="diary-stage__backdrop" style={{ backgroundImage: `url(${assets.diaryHeader.src})` }} />

        <div className="diary-stage__heading">
          <p className="eyebrow">Research guide</p>
          <h1>{entry.title}</h1>
          <p className="hero-summary">{entry.excerpt}</p>
        </div>

        <div className="diary-feature-layout">
          <article className="diary-feature-main">
            <p className="eyebrow">Guide data</p>
            <div className="entry-meta">
              <span>{entry.date}</span>
              <span>{formatMoodLabel(entry.mood)}</span>
            </div>
            <div className="tag-row">
              {entry.tags.map((tag) => (
                <span key={tag} className="tag-pill">
                  {tag}
                </span>
              ))}
            </div>
            <Link className="official-text-link" href="/diary">
              ガイド一覧へ戻る →
            </Link>
          </article>

          {relatedEntries.length ? (
            <div className="diary-feature-side">
              <p className="eyebrow diary-feature-side__label">Related</p>
              {relatedEntries.map((related) => (
                <Link key={related.slug} className="diary-rail-link" href={`/diary/${related.slug}`}>
                  <strong>{related.title}</strong>
                  <span>{related.date}</span>
                  <p>{formatMoodLabel(related.mood)}</p>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="archive-landing">
        <article className="archive-landing__panel">
          <div className="archive-landing__intro">
            <p className="eyebrow">Readable guide</p>
            <h2>本文</h2>
          </div>
          <div className="reading-column">
            {entry.body.map((paragraph, index) => (
              <p key={`${entry.slug}-${index}`}>{paragraph}</p>
            ))}
          </div>
        </article>

        <aside className="archive-landing__panel archive-landing__panel--profile-light">
          <div className="archive-guide-links">
            <Link className="archive-guide-link" href="/diary">
              <strong>リサーチガイド一覧へ</strong>
              <span>ほかのメンバー・楽曲・豆知識の入口をまとめて見たいときはこちらです。</span>
              <em>Archive →</em>
            </Link>
            <Link className="archive-guide-link" href="/profile">
              <strong>発信方針を見る</strong>
              <span>天霧澪がどうやってJuice=Juiceの入口を作るかを確認できます。</span>
              <em>Profile →</em>
            </Link>
            <Link className="archive-guide-link" href="/">
              <strong>ホームへ戻る</strong>
              <span>新しいガイドやXへの導線をまとめた入口へ戻ります。</span>
              <em>Home →</em>
            </Link>
          </div>
        </aside>
      </section>
    </SiteShell>
  );
}
