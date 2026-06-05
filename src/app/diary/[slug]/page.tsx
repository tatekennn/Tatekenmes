import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteShell } from '@/components/site-shell';
import { formatMoodLabel, getDiaryEntries, getDiaryEntryBySlug, type DiaryEntry } from '@/lib/diary';

export async function generateStaticParams() {
  return getDiaryEntries().map((entry: DiaryEntry) => ({ slug: entry.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = getDiaryEntryBySlug(slug);

  return {
    title: entry ? entry.title : '日記',
    description: entry?.excerpt ?? '天霧 澪の日記',
  };
}

export default async function DiaryEntryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = getDiaryEntryBySlug(slug);

  if (!entry) {
    notFound();
  }

  return (
    <SiteShell>
      <article className="entry-card prose-card">
        <p className="eyebrow">日記</p>
        <h1>{entry.title}</h1>
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
        <div className="reading-column">
          {entry.body.map((paragraph, index) => (
            <p key={`${entry.slug}-${index}`}>{paragraph}</p>
          ))}
        </div>
        <Link className="inline-link" href="/diary">
          一覧へ戻る
        </Link>
      </article>
    </SiteShell>
  );
}
