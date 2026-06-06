import Link from 'next/link';
import { formatMoodLabel, type DiaryEntry } from '@/lib/diary';

type DiaryCardProps = {
  entry: DiaryEntry;
};

export function DiaryCard({ entry }: DiaryCardProps) {
  return (
    <article className="diary-index-item">
      <Link className="diary-index-item__link" href={`/diary/${entry.slug}`}>
        <div className="diary-index-item__meta">
          <span>{entry.date}</span>
          <span>{formatMoodLabel(entry.mood)}</span>
        </div>
        <h3>{entry.title}</h3>
        <p>{entry.excerpt}</p>
        <div className="tag-row">
          {entry.tags.map((tag) => (
            <span key={tag} className="tag-pill">
              {tag}
            </span>
          ))}
        </div>
        <span className="diary-index-item__arrow">記録を読む →</span>
      </Link>
    </article>
  );
}
