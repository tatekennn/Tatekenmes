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
  const recentEntries = entries.slice(1, 5);
  const assets = siteData.generatedAssets;
  const profile = siteData.profile;

  return (
    <SiteShell variant="home">
      <section className="archive-hero archive-hero--diary">
        <div className="archive-hero__backdrop" style={{ backgroundImage: `url(${assets.diaryHeader.src})` }} />
        <div className="archive-hero__veil" aria-hidden="true" />

        <div className="archive-hero__content">
          <p className="eyebrow">Diary archive</p>
          <h1>日記</h1>
          <p className="archive-hero__summary">
            配信では話しきれなかったことや、その日のうちに残しておきたかったことをまとめています。
            大げさじゃない日でも、あとで見返したくなりそうなものだけ残しています。
          </p>

          <div className="archive-hero__chips">
            <span>雑談配信</span>
            <span>日々のメモ</span>
            <span>{entries.length} records</span>
          </div>

          <div className="archive-hero__links">
            <Link href="#latest">最新の記録</Link>
            <Link href="#archive-list">一覧で読む</Link>
            <Link href="/profile">プロフィール</Link>
          </div>
        </div>
      </section>

      {latestEntry ? (
        <section className="diary-stage diary-stage--featured" id="latest">
          <div className="diary-stage__backdrop" style={{ backgroundImage: `url(${assets.diaryDecor.src})` }} />

          <div className="diary-stage__heading">
            <p className="eyebrow">Featured entry</p>
            <h2>いちばん新しい記録</h2>
          </div>

          <div className="diary-feature-layout">
            <article className="diary-feature-main">
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

            {recentEntries.length ? (
              <div className="diary-feature-side">
                <p className="eyebrow diary-feature-side__label">Recent</p>
                {recentEntries.map((entry: DiaryEntry) => (
                  <Link key={entry.slug} className="diary-rail-link" href={`/diary/${entry.slug}`}>
                    <strong>{entry.title}</strong>
                    <span>{entry.date}</span>
                    <p>{formatMoodLabel(entry.mood)}</p>
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="archive-note-band">
        <div className="archive-note-band__copy">
          <p className="eyebrow">About these notes</p>
          <h2>あとで思い出せる形にしておくための記録です</h2>
          <p>
            {profile.name} の日記には、配信では流れてしまいそうな話や、その日のうちに残しておきたかったことを書いています。
            読み物というより、あとで自分でも見返せるように整えているメモに近いです。
          </p>
        </div>

        <div className="archive-note-band__links">
          <Link className="archive-note-band__link" href="/profile">
            <strong>プロフィールを見る</strong>
            <span>どんな感じで活動しているかを、もう少しまとまった形で見られます。</span>
          </Link>
          <Link className="archive-note-band__link" href="/">
            <strong>ホームへ戻る</strong>
            <span>更新先や配信導線をまとめて見たいときはこちらへ。</span>
          </Link>
        </div>
      </section>

      <section className="diary-index-list" id="archive-list">
        {entries.length > 0 ? (
          entries.map((entry: DiaryEntry) => <DiaryCard key={entry.slug} entry={entry} />)
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
