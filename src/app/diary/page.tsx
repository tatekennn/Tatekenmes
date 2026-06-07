import Link from 'next/link';
import { SiteShell } from '@/components/site-shell';
import { siteData } from '@/content/site-data';
import { formatMoodLabel, getDiaryEntries, type DiaryEntry } from '@/lib/diary';

export const metadata = {
  title: '調査メモ | 天霧 澪',
};

export default function DiaryIndexPage() {
  const entries = getDiaryEntries();
  const latestEntry = entries[0];
  const archiveEntries = latestEntry ? entries.slice(1) : entries;
  const assets = siteData.generatedAssets;
  const xLink = siteData.socialLinks.find((item) => item.label.toLowerCase() === 'x') ?? siteData.socialLinks[0];

  return (
    <SiteShell variant="home">
      <section className="pop-sub-hero pop-sub-hero--diary" aria-label="天霧澪 調査メモページ">
        <div className="pop-sub-hero__decor" aria-hidden="true">
          <span>MEMO</span>
          <i>♪</i>
          <b>✦</b>
        </div>
        <div className="pop-sub-hero__visual" aria-hidden="true">
          <img src={assets.diaryHeader.src} alt="" />
        </div>
        <div className="pop-sub-hero__copy">
          <p className="pop-home-hero__site">AMAGIRI MIO / JUICE=JUICE NOTES</p>
          <p className="eyebrow">Research memo</p>
          <h1>調査メモ</h1>
          <p>
            Juice=Juiceの魅力を初めて見る人にも届けるために、公式情報・メンバー・楽曲の入口を調べて、読みやすいメモにしています。
          </p>
          <div className="pop-sub-hero__links">
            <a href="#latest">最新</a>
            <a href="#archive-list">一覧</a>
            <Link href="/profile">発信方針</Link>
          </div>
        </div>
      </section>

      {latestEntry ? (
        <section className="pop-diary-feature" id="latest" aria-labelledby="latest-diary-title">
          <div className="pop-section-heading pop-section-heading--news">
            <span aria-hidden="true">LATEST</span>
            <p className="eyebrow">Latest memo</p>
            <h2 id="latest-diary-title">いちばん新しい調査メモ</h2>
          </div>
          <Link className="pop-diary-feature__article" href={`/diary/${latestEntry.slug}`}>
            <time>{latestEntry.date}</time>
            <h3>{latestEntry.title}</h3>
            <p>{latestEntry.excerpt}</p>
            <div className="pop-diary-feature__meta">
              <span>{formatMoodLabel(latestEntry.mood)}</span>
              {latestEntry.tags.slice(0, 3).map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
            <strong>続きを読む →</strong>
          </Link>
        </section>
      ) : null}

      <section className="pop-diary-archive" id="archive-list" aria-labelledby="archive-list-title">
        <div className="pop-section-heading">
          <span aria-hidden="true">ARCHIVE</span>
          <p className="eyebrow">Archive</p>
          <h2 id="archive-list-title">メモ一覧</h2>
        </div>
        <div className="pop-diary-archive__list">
          {archiveEntries.length > 0 ? (
            archiveEntries.map((entry: DiaryEntry, index) => (
              <Link key={entry.slug} className="pop-diary-archive__item" href={`/diary/${entry.slug}`}>
                <span className="pop-diary-archive__num">{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <time>{entry.date}</time>
                  <h3>{entry.title}</h3>
                  <p>{entry.excerpt}</p>
                </div>
                <span className="pop-diary-archive__arrow">→</span>
              </Link>
            ))
          ) : latestEntry ? (
            <p className="pop-diary-archive__empty">過去のメモはまだありません。</p>
          ) : (
            <p className="pop-diary-archive__empty">まだメモがありません。</p>
          )}
        </div>
      </section>

      <section className="pop-guide-band pop-guide-band--subpage" aria-labelledby="diary-guide-title">
        <div className="pop-guide-band__visual" aria-hidden="true">
          <img src="/generated/mio-chibi-guide-20260606.png" alt="" />
        </div>
        <div className="pop-guide-band__copy">
          <p className="eyebrow">Short form</p>
          <h2 id="diary-guide-title">Xではもっと短く</h2>
          <p>ここでは少し詳しく、Xでは一つの発見を短く。ファンになる入口を増やすために、情報の温度を分けて発信します。</p>
        </div>
        <div className="pop-guide-band__links">
          {xLink ? (
            <a href={xLink.href} target={xLink.external ? '_blank' : undefined} rel={xLink.external ? 'noreferrer' : undefined}>
              Xを見る
            </a>
          ) : null}
          <Link href="/">ホームへ</Link>
        </div>
      </section>
    </SiteShell>
  );
}
