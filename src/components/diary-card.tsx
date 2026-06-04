import Link from 'next/link';
import { formatMoodLabel, type DiaryEntry } from '@/lib/diary';
import { SectionCard } from '@/components/section-card';

type DiaryCardProps = {
  entry: DiaryEntry;
};

export function DiaryCard({ entry }: DiaryCardProps) {
  return (
    <SectionCard title={entry.title} eyebrow="日記">
      <article className="diary-card">
        <div className="diary-card__meta">
          <span>{entry.date}</span>
          <span>{formatMoodLabel(entry.mood)}</span>
        </div>
        <p>{entry.excerpt}</p>
        <div className="tag-row">
          {entry.tags.map((tag) => (
            <span key={tag} className="tag-pill">
              {tag}
            </span>
          ))}
        </div>
        <Link className="diary-card__link" href={`/diary/${entry.slug}`}>
          記録を読む →
        </Link>
      </article>
    </SectionCard>
  );
}
