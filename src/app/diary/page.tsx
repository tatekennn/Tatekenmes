import { DiaryCard } from '@/components/diary-card';
import { SectionCard } from '@/components/section-card';
import { SiteShell } from '@/components/site-shell';
import { getDiaryEntries, type DiaryEntry } from '@/lib/diary';

export const metadata = {
  title: '日記 | 天霧 澪',
};

export default function DiaryIndexPage() {
  const entries = getDiaryEntries();

  return (
    <SiteShell>
      <section className="hero-card compact-hero">
        <p className="eyebrow">アーカイブ</p>
        <h1>日記</h1>
        <p className="hero-summary">静かな平日と、街の端に残った違和感を日付順に並べた記録。</p>
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
