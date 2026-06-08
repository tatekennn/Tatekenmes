import * as fs from 'node:fs';
import * as path from 'node:path';

export type DiaryEntry = {
  slug: string;
  date: string;
  title: string;
  excerpt: string;
  tags: string[];
  mood: string;
  body: string[];
  lead?: string;
  sectionTitles?: string[];
  takeaway?: string;
};

export const moodLabels: Record<string, string> = {
  quiet: '静かな日',
  hushed: 'ひそやかな夜',
  reflective: '反芻する夜',
  observant: '観測寄り',
  unsettled: 'わずかな揺れ',
  subtle: 'かすかな気配',
  calm: '静かな帰宅',
};

const diaryDirectory = path.join(process.cwd(), 'content', 'diary');

function isDiaryEntry(value: unknown): value is DiaryEntry {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const entry = value as Record<string, unknown>;

  return (
    typeof entry.slug === 'string' &&
    typeof entry.date === 'string' &&
    typeof entry.title === 'string' &&
    typeof entry.excerpt === 'string' &&
    typeof entry.mood === 'string' &&
    Array.isArray(entry.tags) &&
    entry.tags.every((tag) => typeof tag === 'string') &&
    Array.isArray(entry.body) &&
    entry.body.every((paragraph) => typeof paragraph === 'string') &&
    (entry.lead === undefined || typeof entry.lead === 'string') &&
    (entry.takeaway === undefined || typeof entry.takeaway === 'string') &&
    (entry.sectionTitles === undefined ||
      (Array.isArray(entry.sectionTitles) && entry.sectionTitles.every((title) => typeof title === 'string')))
  );
}

function sortByDateDesc(entries: DiaryEntry[]) {
  return [...entries].sort((a, b) => b.date.localeCompare(a.date));
}

export function formatMoodLabel(mood: string): string {
  return moodLabels[mood] ?? mood;
}

export function getDiaryEntries(): DiaryEntry[] {
  if (!fs.existsSync(diaryDirectory)) {
    return [];
  }

  const files = fs.readdirSync(diaryDirectory).filter((file: string) => file.endsWith('.json'));
  const entries: DiaryEntry[] = [];

  for (const file of files) {
    try {
      const fullPath = path.join(diaryDirectory, file);
      const raw = fs.readFileSync(fullPath, 'utf8');
      const parsed: unknown = JSON.parse(raw);

      if (isDiaryEntry(parsed)) {
        entries.push(parsed);
      } else {
        console.warn(`[diary] Invalid entry shape skipped: ${file}`);
      }
    } catch (error) {
      console.warn(`[diary] Failed to load ${file}:`, error);
      continue;
    }
  }

  return sortByDateDesc(entries);
}

export function getDiaryEntryBySlug(slug: string): DiaryEntry | undefined {
  return getDiaryEntries().find((entry) => entry.slug === slug);
}

export function getLatestDiaryEntries(limit = 3): DiaryEntry[] {
  return getDiaryEntries().slice(0, limit);
}
