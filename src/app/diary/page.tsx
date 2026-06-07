import Link from 'next/link';
import { DiaryCard } from '@/components/diary-card';
import { SiteShell } from '@/components/site-shell';
import { siteData } from '@/content/site-data';
import { formatMoodLabel, getDiaryEntries, type DiaryEntry } from '@/lib/diary';

export const metadata = {
  title: '日記 | 天霧 澪',
};

export default function DiaryIndexPage() {
  const entries = getDiaryEntries();
  const latestEntry = entries[0];
  const archiveEntries = latestEntry ? entries.slice(1) : entries;
  const assets = siteData.generatedAssets;
  const profile = siteData.profile;
  const xLink = siteData.socialLinks.find((item) => item.label.toLowerCase() === 'x') ?? siteData.socialLinks[0];

  return (
    <SiteShell variant="home">
      <section className="archive-hero archive-hero--diary">
        <div className="archive-hero__backdrop" style={{ backgroundImage: `url(${assets.diaryHeader.src})` }} />
        <div className="archive-hero__veil" aria-hidden="true" />

        <div className="archive-hero__content">
          <p className="eyebrow">Diary</p>
          <h1>日記</h1>
          <p className="archive-hero__summary">
            Juice=Juiceを知っていく途中の、天霧澪の記録です。
            曲、MV、ニュースに出会ったときの感想を、少しずつ残しています。
          </p>

          <div className="archive-hero__chips" aria-label="日記の概要">
            <span>音楽メモ</span>
            <span>発見の記録</span>
            <span>{entries.length} records</span>
          </div>

          <div className="archive-hero__links">
            <Link href="#latest">最新</Link>
            <Link href="#archive-list">記録一覧</Link>
            <Link href="/profile">プロフィール</Link>
          </div>
        </div>
      </section>

      <section className="archive-note-band archive-note-band--diary-intro">
        <div className="archive-note-band__copy">
          <p className="eyebrow">About these notes</p>
          <h2>{profile.name} が、今知っていること</h2>
          <p>
            最近ハマったばかりだから、まだ知らない曲がたくさんあります。
            ここでは、詳しい解説よりも、初めて聴いたときの気持ちや発見を中心に書いています。
          </p>
        </div>

        <div className="archive-note-band__links">
          <Link className="archive-note-band__link" href="/profile">
            <strong>プロフィールを見る</strong>
            <span>天霧澪について、もう少しまとまった形で見られます。</span>
          </Link>
          {xLink ? (
            <a
              className="archive-note-band__link"
              href={xLink.href}
              target={xLink.external ? '_blank' : undefined}
              rel={xLink.external ? 'noreferrer' : undefined}
            >
              <strong>Xを見る</strong>
              <span>短い反応や更新はこちらに置いています。</span>
            </a>
          ) : null}
        </div>
      </section>

      {latestEntry ? (
        <section className="diary-stage diary-stage--featured" id="latest">
          <div className="diary-stage__backdrop" style={{ backgroundImage: `url(${assets.diaryDecor.src})` }} />

          <div className="diary-stage__heading">
            <p className="eyebrow">Latest entry</p>
            <h2>いちばん新しい記録</h2>
          </div>

          <article className="diary-feature-main diary-feature-main--solo">
            <p className="eyebrow">{latestEntry.date}</p>
            <h3>{latestEntry.title}</h3>
            <div className="entry-meta">
              <span>{formatMoodLabel(latestEntry.mood)}</span>
              <span>{latestEntry.tags.join(' / ')}</span>
            </div>
            <p className="diary-feature-main__excerpt">{latestEntry.excerpt}</p>
            <Link className="official-text-link" href={`/diary/${latestEntry.slug}`}>
              続きを読む →
            </Link>
          </article>
        </section>
      ) : null}

      <section className="diary-index-list" id="archive-list" aria-labelledby="archive-list-title">
        <div className="diary-index-list__heading">
          <p className="eyebrow">Archive</p>
          <h2 id="archive-list-title">記録一覧</h2>
        </div>
        {archiveEntries.length > 0 ? (
          archiveEntries.map((entry: DiaryEntry) => <DiaryCard key={entry.slug} entry={entry} />)
        ) : latestEntry ? (
          <p className="diary-index-list__empty">過去の記録はまだありません。</p>
        ) : (
          <section className="archive-note-band archive-note-band--empty">
            <div className="archive-note-band__copy">
              <p className="eyebrow">No records yet</p>
              <h2>まだ記録がありません</h2>
              <p>content/diary に記録が追加されると、この一覧に反映されます。</p>
            </div>
          </section>
        )}
      </section>
    </SiteShell>
  );
}
