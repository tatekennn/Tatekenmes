import Link from 'next/link';
import { SiteShell } from '@/components/site-shell';
import { getLatestDiaryEntries } from '@/lib/diary';
import { siteData } from '@/content/site-data';

export default function HomePage() {
  const latestEntry = getLatestDiaryEntries(1)[0];
  const recentEntries = getLatestDiaryEntries(3);
  const profile = siteData.profile;
  const assets = siteData.generatedAssets;
  const socials = siteData.socialLinks;
  const xLink = socials.find((item) => item.label.toLowerCase() === 'x') ?? socials[0];

  return (
    <SiteShell variant="home">
      <section className="home-hero-panel fade-in-section" id="top">
        <div className="home-hero-panel__visual">
          <img className="home-hero-panel__bg" src={assets.heroMain.src} alt={assets.heroMain.alt} />
          <div className="home-hero-panel__veil" aria-hidden="true" />

          <div className="home-hero-panel__body">
            <div className="home-hero-panel__copy">
              <p className="eyebrow">天霧 澪 の Juice=Juice 日記</p>
              <p className="home-hero-panel__ruby">{profile.ruby} / AMAGIRI MIO</p>
              <h1>最近、Juice=Juiceにハマりました。</h1>
              <p className="home-hero-panel__summary">
                きっかけは「プラトニック・プラネット」。
                この曲に惹かれて、他の曲も少しずつ聴いています。
                知らない曲に出会うたびに、ここに書いています。
              </p>

              <div className="home-hero-panel__actions">
                <Link className="pill-button" href="/diary">
                  日記を読む
                </Link>
                {xLink ? (
                  <a
                    className="official-text-link"
                    href={xLink.href}
                    target={xLink.external ? '_blank' : undefined}
                    rel={xLink.external ? 'noreferrer' : undefined}
                  >
                    X →
                  </a>
                ) : null}
              </div>

              <div className="home-hero-panel__route" aria-label="主要導線">
                <Link href="/diary#latest">LATEST</Link>
                <Link href="/diary">DIARY</Link>
                <Link href="/profile">PROFILE</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {latestEntry ? (
        <section className="home-news-line fade-in-section" id="latest">
          <p className="home-news-line__label">Latest</p>
          <div className="home-news-line__main">
            <span className="home-news-line__date">{latestEntry.date}</span>
            <strong>{latestEntry.title}</strong>
            <p>{latestEntry.excerpt}</p>
          </div>
          <Link className="official-text-link" href={`/diary/${latestEntry.slug}`}>
            この日記を読む →
          </Link>
        </section>
      ) : null}

      <section className="home-section-plain home-section-plain--about fade-in-section" id="about">
        <div className="home-section-plain__copy">
          <p className="eyebrow">About</p>
          <p className="home-ambient-label">はじめまして</p>
          <h2>天霧 澪です</h2>
          {profile.bio.slice(0, 2).map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}

          <dl className="home-fact-line">
            {siteData.quickFacts.slice(0, 3).map((fact) => (
              <div key={fact.label} className="home-fact-line__item">
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>

          <Link className="official-text-link" href="/profile">
            プロフィールを見る →
          </Link>
        </div>

        <div className="home-section-plain__visual">
          <span className="home-section-plain__stamp" aria-hidden="true">
            newcomer
          </span>
          <img src={assets.diaryHeader.src} alt={assets.diaryHeader.alt} className="home-section-plain__image" />
        </div>
      </section>

      {recentEntries.length > 1 ? (
        <section className="home-diary-preview fade-in-section" id="diary-preview">
          <div className="home-diary-preview__header">
            <p className="eyebrow">Diary</p>
            <h2>最近の記録</h2>
            <p>知らない曲に出会うたびに、ここに書いています。</p>
          </div>

          <div className="home-diary-preview__grid">
            {recentEntries.slice(0, 3).map((entry) => (
              <Link key={entry.slug} className="home-diary-preview__card" href={`/diary/${entry.slug}`}>
                <span className="home-diary-preview__date">{entry.date}</span>
                <strong>{entry.title}</strong>
                <p>{entry.excerpt}</p>
              </Link>
            ))}
          </div>

          <Link className="official-text-link" href="/diary">
            すべての日記を見る →
          </Link>
        </section>
      ) : null}

      <section className="home-connect-line fade-in-section" id="contact">
        <div>
          <p className="eyebrow">Follow</p>
          <p className="home-ambient-label">X / 日記 / 更新</p>
          <h2>ここから辿れます</h2>
          <p>日記は毎日更新しています。Xでは短い反応やメモを書いています。</p>
        </div>

        <div className="home-connect-line__links">
          {xLink ? (
            <a
              className="home-connect-line__link"
              href={xLink.href}
              target={xLink.external ? '_blank' : undefined}
              rel={xLink.external ? 'noreferrer' : undefined}
            >
              <strong>{xLink.label}</strong>
              <span>{xLink.note}</span>
            </a>
          ) : null}
        </div>

        <div className="home-ending-mark" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
      </section>
    </SiteShell>
  );
}
