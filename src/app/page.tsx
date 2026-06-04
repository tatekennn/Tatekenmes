import { DiaryCard } from '@/components/diary-card';
import { SectionCard } from '@/components/section-card';
import { SiteShell } from '@/components/site-shell';
import { getLatestDiaryEntries, type DiaryEntry } from '@/lib/diary';
import { siteData } from '@/content/site-data';

export default function HomePage() {
  const latestEntries = getLatestDiaryEntries(3);
  const profile = siteData.profile;
  const featuredQuote = siteData.featuredQuote;
  const summary = profile.bio[0];
  const worldFragments = siteData.worldFragments.slice(0, 3);
  const profileFacts = siteData.quickFacts.slice(0, 4);

  return (
    <SiteShell>
      <section className="hero-card">
        <p className="eyebrow">観測記録</p>
        <h1>{profile.name}</h1>
        <p className="hero-summary">{summary}</p>
        <blockquote className="hero-quote">「{featuredQuote}」</blockquote>
      </section>

      <section className="content-grid two-up">
        <SectionCard title="横顔" eyebrow="プロフィール">
          <dl className="detail-list">
            {profileFacts.map((fact) => (
              <div key={fact.label} className="detail-row">
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
        </SectionCard>

        <SectionCard title="夜の断片" eyebrow="観測メモ">
          <div className="stack-list compact">
            {worldFragments.map((fragment) => (
              <article key={fragment.title} className="stack-item">
                <h3>{fragment.title}</h3>
                <p>{fragment.text}</p>
              </article>
            ))}
          </div>
        </SectionCard>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">最近の記録</p>
            <h2>最近の日記</h2>
          </div>
        </div>
        <div className="diary-grid">
          {latestEntries.length > 0 ? (
            latestEntries.map((entry: DiaryEntry) => <DiaryCard key={entry.slug} entry={entry} />)
          ) : (
            <SectionCard title="まだ記録がありません">
              <p>content/diary に記録が追加されると、ここに表示されます。</p>
            </SectionCard>
          )}
        </div>
      </section>
    </SiteShell>
  );
}
