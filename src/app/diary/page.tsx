import { DiaryCard } from '@/components/diary-card';
import { SectionCard } from '@/components/section-card';
import { SiteShell } from '@/components/site-shell';
import { siteData } from '@/content/site-data';
import { getDiaryEntries, type DiaryEntry } from '@/lib/diary';

export const metadata = {
  title: '日記',
};

export default function DiaryIndexPage() {
  const entries = getDiaryEntries();
  const assets = siteData.generatedAssets;

  return (
    <SiteShell>
      <section className="hero-card compact-hero diary-hero">
        <div className="diary-hero__copy">
          <p className="eyebrow">アーカイブ</p>
          <h1>日記</h1>
          <p className="hero-summary">静かな平日と、街の端に残った違和感を日付順に並べた記録。</p>
        </div>
        <img className="diary-hero__image" src={assets.diaryHeader.src} alt={assets.diaryHeader.alt} />
      </section>

      <section className="section-card decor-banner" aria-label="日記ページの装飾背景">
        <img className="decor-banner__image" src={assets.diaryDecor.src} alt={assets.diaryDecor.alt} />
      </section>

      <section className="diary-grid">
        {entries.length > 0 ? (
          entries.map((entry: DiaryEntry) => <DiaryCard key={entry.slug} entry={entry} />)
        ) : (
          <SectionCard title="まだ記録がありません">
            <p>content/diary に記録が追加されると、この一覧に反映されます。</p>
          </SectionCard>
        )}
      </section>
    </SiteShell>
  );
}
