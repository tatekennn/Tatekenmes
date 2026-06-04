import Link from 'next/link';
import { DiaryCard } from '@/components/diary-card';
import { SectionCard } from '@/components/section-card';
import { SiteShell } from '@/components/site-shell';
import { getLatestDiaryEntries, type DiaryEntry } from '@/lib/diary';
import { siteData } from '@/content/site-data';

const selectedVisuals = [
  {
    id: 'hero',
    title: 'トップビジュアル',
    note: 'ファーストビューの主役',
    placement: 'ホーム',
    motif: '夜景・紫髪・静かな視線',
    image: siteData.generatedAssets.heroMain.src,
  },
  {
    id: 'profile',
    title: 'プロフィール立ち絵',
    note: '詳細ページ用',
    placement: 'プロフィール',
    motif: '全身・事務職らしい輪郭・落ち着いた配色',
    image: siteData.generatedAssets.profileFull.src,
  },
  {
    id: 'icon',
    title: 'プロフィールアイコン',
    note: '小さく使いやすい',
    placement: '共通アイコン',
    motif: '肩上・やわらかな表情・小さめ表示向き',
    image: siteData.generatedAssets.profileIcon.src,
  },
  {
    id: 'diary',
    title: '日記ヘッダー',
    note: '一覧や導入向け',
    placement: '日記',
    motif: '机・夜更け・静かな観測感',
    image: siteData.generatedAssets.diaryHeader.src,
  },
  {
    id: 'decor',
    title: '装飾背景',
    note: '区切りや背景に',
    placement: '背景装飾',
    motif: 'ノート・文具・淡い記号性',
    image: siteData.generatedAssets.diaryDecor.src,
  },
] as const;

export default function HomePage() {
  const latestEntries = getLatestDiaryEntries(3);
  const profile = siteData.profile;
  const featuredQuote = siteData.featuredQuote;
  const summary = profile.bio[0];
  const worldFragments = siteData.worldFragments.slice(0, 3);
  const profileFacts = siteData.quickFacts;
  const assets = siteData.generatedAssets;

  return (
    <SiteShell>
      <section className="hero-card hero-stage">
        <div className="hero-layout">
          <div className="hero-copy">
            <p className="eyebrow">Official archive / diary / nocturne</p>
            <p className="hero-ruby">{profile.ruby} / AMAGIRI MIO</p>
            <h1>{profile.name}</h1>
            <p className="hero-summary">{summary}</p>
            <blockquote className="hero-quote">「{featuredQuote}」</blockquote>
            <div className="hero-actions">
              <Link className="pill-button" href="/diary">
                最新の日記を見る
              </Link>
              <Link className="pill-button secondary" href="/profile">
                プロフィールへ
              </Link>
            </div>
            <div className="hero-chips" aria-label="キャラクター概要">
              <span className="hero-chip">都内勤務 / 夜の観測者</span>
              <span className="hero-chip">現実 {profile.worldRatio.reality}%</span>
              <span className="hero-chip">微かな異界 {profile.worldRatio.occult}%</span>
            </div>
          </div>

          <div className="hero-visual hero-visual--image" aria-label="天霧澪のイメージビジュアル">
            <img className="hero-visual__image" src={assets.heroMain.src} alt={assets.heroMain.alt} />
            <div className="visual-ring visual-ring--one" />
            <div className="visual-ring visual-ring--two" />
            <div className="visual-card">
              <p className="eyebrow">Main visual</p>
              <strong>夜のオフィスに立つ、天霧 澪</strong>
              <span>トップページの主役として選んだ一枚。明るい公式感を残しつつ、街を観測する気配だけを薄く重ねています。</span>
            </div>
            <div className="visual-badge visual-badge--top">都心の夜景</div>
            <div className="visual-badge visual-badge--bottom">観測の気配</div>
          </div>
        </div>
      </section>

      <section className="content-grid two-up spotlight-grid">
        <SectionCard title="澪の横顔" eyebrow="Profile">
          <div className="profile-inline">
            <img className="profile-inline__icon" src={assets.profileIcon.src} alt={assets.profileIcon.alt} />
            <dl className="detail-list">
              {profileFacts.map((fact) => (
                <div key={fact.label} className="detail-row">
                  <dt>{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </SectionCard>

        <SectionCard title="このサイトの見え方" eyebrow="Concept">
          <div className="stack-list compact">
            <article className="stack-item split-note">
              <h3>明るいのに、夜が残る</h3>
              <p>黒を前面に出すのではなく、アイボリーやラベンダーを主役にして、深い紺や月光で輪郭だけを静かに締めています。</p>
            </article>
            <article className="stack-item split-note">
              <h3>キャラサイトとしての体温</h3>
              <p>日記、プロフィール、世界観の順で、物語を説明するというより、澪の空気に入っていく構成を意識しています。</p>
            </article>
          </div>
        </SectionCard>
      </section>

      <section className="section-block showcase-block">
        <div className="section-heading section-intro">
          <div>
            <p className="eyebrow">Visual archive</p>
            <h2>採用したビジュアル</h2>
            <p>
              サイト内で実際に使っている主要ビジュアルです。トップ、プロフィール、日記、背景で役割を分けながら、澪の空気感がぶれないように揃えています。
            </p>
          </div>
        </div>
        <div className="showcase-grid">
          {selectedVisuals.map((concept) => (
            <article key={concept.id} className="showcase-card">
              <img src={concept.image} alt={`${profile.name} selected visual: ${concept.title}`} />
              <div className="showcase-meta">
                <div>
                  <p className="eyebrow">{concept.placement}</p>
                  <h3>{concept.title}</h3>
                </div>
                <span className="tag-pill">{concept.note}</span>
              </div>
              <p>{concept.motif}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading section-intro">
          <div>
            <p className="eyebrow">Diary pickup</p>
            <h2>最近の日記</h2>
            <p>静かな平日と、街の端に残った違和感。最新の記録だけを先にひらいています。</p>
          </div>
          <Link className="pill-button secondary" href="/diary">
            一覧を見る
          </Link>
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

      <section className="content-grid two-up">
        <SectionCard title="夜の断片" eyebrow="Worldview">
          <div className="stack-list compact">
            {worldFragments.map((fragment) => (
              <article key={fragment.title} className="stack-item">
                <h3>{fragment.title}</h3>
                <p>{fragment.text}</p>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="入口の案内" eyebrow="Guide">
          <div className="stack-list compact">
            <article className="stack-item split-note">
              <h3>日記</h3>
              <p>短い記録を時系列で読みたいときはこちら。日常と違和感の温度差が、いちばん素直に残ります。</p>
              <Link className="inline-link" href="/diary">
                日記一覧へ →
              </Link>
            </article>
            <article className="stack-item split-note">
              <h3>プロフィール / 世界観</h3>
              <p>澪の輪郭を先に知りたいならプロフィールへ。街の気配だけを辿りたいなら世界観ページへどうぞ。</p>
              <div className="tag-row">
                <Link className="inline-link" href="/profile">
                  プロフィールへ →
                </Link>
                <Link className="inline-link" href="/world">
                  世界観へ →
                </Link>
              </div>
            </article>
          </div>
        </SectionCard>
      </section>
    </SiteShell>
  );
}
