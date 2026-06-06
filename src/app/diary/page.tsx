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
      <section className="talent-hero">
        <div className="talent-hero__backdrop" style={{ backgroundImage: `url(${assets.diaryHeader.src})` }} />
        <div className="talent-hero__glow talent-hero__glow--one" aria-hidden="true" />
        <div className="talent-hero__glow talent-hero__glow--two" aria-hidden="true" />

        <div className="talent-hero__grid">
          <div className="talent-hero__figure-column">
            <div className="talent-hero__figure-card">
              <div className="talent-hero__figure-frame" aria-hidden="true" />
              <img className="talent-hero__figure-image" src={assets.diaryHeader.src} alt={assets.diaryHeader.alt} />
              <div className="talent-hero__figure-note">
                <strong>Daily archive</strong>
                <span>仕事のあとに残しておきたかったことを、日付ごとに静かに並べています。</span>
              </div>
            </div>
          </div>

          <div className="talent-hero__copy-column">
            <section className="talent-logo-panel">
              <p className="eyebrow">Diary archive</p>
              <p className="talent-logo-panel__ruby">WORK NOTES / RETURN HOME / SMALL RECORDS</p>
              <h1>日記</h1>
              <p className="talent-logo-panel__summary">
                仕事のこと、帰り道で気になったこと、その日のうちに書いておきたかったことをまとめています。
                派手な出来事ではなくても、あとから見返したくなる日だけ残しています。
              </p>
              <div className="talent-logo-panel__chips">
                <span>都内の事務仕事</span>
                <span>帰り道のメモ</span>
                <span>{entries.length} records</span>
              </div>
              <p className="talent-logo-panel__quote">大げさに飾るより、その日にあったことが自然に思い出せる形を優先しています。</p>
            </section>

            <section className="talent-meta-panel">
              <div className="talent-meta-panel__lead">
                <h2>読む前の目安</h2>
                <p>仕事や生活の手触りが先にあって、そのあとに少しだけ説明しにくい違和感が混ざる。今はそのくらいの距離感で揃えています。</p>
              </div>
              <dl className="talent-meta-grid">
                <div className="talent-meta-grid__item">
                  <dt>書き方</dt>
                  <dd>一人称の短い記録</dd>
                </div>
                <div className="talent-meta-grid__item">
                  <dt>主な内容</dt>
                  <dd>仕事・通勤・帰宅後のこと</dd>
                </div>
                <div className="talent-meta-grid__item">
                  <dt>雰囲気</dt>
                  <dd>静かめ / 現実寄り / 控えめ</dd>
                </div>
                <div className="talent-meta-grid__item">
                  <dt>更新基準</dt>
                  <dd>その日のうちに残したいと思った日</dd>
                </div>
              </dl>
            </section>
          </div>
        </div>

        <div className="hero-link-strip">
          <Link className="hero-link-card" href="#latest">
            <p className="eyebrow">Latest</p>
            <div>
              <strong>最新の記録</strong>
              <p>いちばん新しい日記から、その日の空気感を確認できます。</p>
            </div>
            <span>→</span>
          </Link>
          <Link className="hero-link-card" href="#archive-list">
            <p className="eyebrow">Archive</p>
            <div>
              <strong>一覧で読む</strong>
              <p>日付順にまとめて見たいときはこちらです。</p>
            </div>
            <span>→</span>
          </Link>
          <Link className="hero-link-card" href="/profile">
            <p className="eyebrow">Profile</p>
            <div>
              <strong>{profile.name} について</strong>
              <p>日記を書いている人の普段の輪郭もプロフィールにまとめています。</p>
            </div>
            <span>→</span>
          </Link>
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

      <section className="archive-landing">
        <section className="archive-landing__panel archive-landing__panel--profile-light">
          <div className="archive-landing__profile">
            <img className="profile-inline__icon" src={assets.profileIcon.src} alt={assets.profileIcon.alt} />
            <div className="archive-landing__intro">
              <p className="eyebrow">About these notes</p>
              <h2>あとで思い出せる形にしておくための記録です</h2>
              <p>
                {profile.name} は平日は都内で事務の仕事をしていて、日記にはその日の仕事や帰り道や部屋に戻ってからのことを書いています。
                読み物というより、自分の中で一度きちんと置いておくための記録に近いです。
              </p>
            </div>
          </div>
        </section>

        <section className="archive-landing__panel archive-landing__panel--guide-light">
          <div className="archive-guide-links">
            <Link className="archive-guide-link" href="/profile">
              <strong>プロフィールを見る</strong>
              <span>仕事や暮らし方など、日記の前提になる普段の情報をまとめています。</span>
              <em>Profile →</em>
            </Link>
            <Link className="archive-guide-link" href="/">
              <strong>ホームへ戻る</strong>
              <span>サイト全体の入口に戻って、配信や更新先も確認できます。</span>
              <em>Home →</em>
            </Link>
          </div>
        </section>
      </section>

      <section className="diary-grid" id="archive-list">
        {entries.length > 0 ? (
          entries.map((entry: DiaryEntry) => <DiaryCard key={entry.slug} entry={entry} />)
        ) : (
          <section className="archive-landing__panel">
            <div className="archive-landing__intro">
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
