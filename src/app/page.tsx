import Link from 'next/link';
import { SiteShell } from '@/components/site-shell';
import { getLatestDiaryEntries } from '@/lib/diary';
import { siteData } from '@/content/site-data';

export default function HomePage() {
  const latestEntry = getLatestDiaryEntries(1)[0];
  const profile = siteData.profile;
  const assets = siteData.generatedAssets;
  const socials = siteData.socialLinks;
  const youtube = socials.find((item) => item.label.toLowerCase().includes('youtube')) ?? socials[0];
  const xLink = socials.find((item) => item.label.toLowerCase() === 'x') ?? socials[1] ?? socials[0];
  const socialLinks = [youtube, xLink].filter((item, index, arr): item is NonNullable<typeof item> => Boolean(item) && arr.indexOf(item) === index);
  const aboutParagraphs = profile.bio.slice(0, 2);
  const quickFacts = siteData.quickFacts.slice(0, 3);
  const streamNotes = [
    '雑談中心で、ゆっくり話せる配信をしていくつもりです',
    'X ではお知らせやひとこと、日記ではもう少し長めの話を書いています',
    'アーカイブもあとで見返しやすいように残しています',
  ] as const;

  return (
    <SiteShell variant="home">
      <section className="home-hero-panel fade-in-section" id="top">
        <div className="home-hero-panel__visual">
          <img className="home-hero-panel__bg" src={assets.heroMain.src} alt={assets.heroMain.alt} />
          <div className="home-hero-panel__veil" aria-hidden="true" />

          <div className="home-hero-panel__body">
            <div className="home-hero-panel__copy">
              <p className="eyebrow">Official site</p>
              <p className="home-hero-panel__ruby">{profile.ruby} / AMAGIRI MIO</p>
              <h1>配信のことも、日記のことも、ここにまとめています。</h1>
              <p className="home-hero-panel__summary">天霧澪のオフィシャルサイトです。更新のお知らせや日記、あとで見返したいことを、ゆっくり置いています。</p>

              <div className="home-hero-panel__actions">
                <Link className="pill-button" href="/diary">
                  日記を読む
                </Link>
                {youtube ? (
                  <a
                    className="official-text-link"
                    href={youtube.href}
                    target={youtube.external ? '_blank' : undefined}
                    rel={youtube.external ? 'noreferrer' : undefined}
                  >
                    YouTube →
                  </a>
                ) : null}
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
                <Link href="/profile">PROFILE</Link>
                <Link href="/diary#latest">LATEST</Link>
                <Link href="/diary">DIARY</Link>
                {youtube ? (
                  <a href={youtube.href} target={youtube.external ? '_blank' : undefined} rel={youtube.external ? 'noreferrer' : undefined}>
                    MOVIE
                  </a>
                ) : null}
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
            最新の日記を見る →
          </Link>
        </section>
      ) : null}

      <section className="home-section-plain home-section-plain--about fade-in-section" id="about">
        <div className="home-section-plain__copy">
          <p className="eyebrow">About</p>
          <p className="home-ambient-label">Profile / voice / mood</p>
          <h2>はじめまして、天霧澪です</h2>
          {aboutParagraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}

          <dl className="home-fact-line">
            {quickFacts.map((fact) => (
              <div key={fact.label} className="home-fact-line__item">
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>

          <Link className="official-text-link" href="/profile">
            プロフィールへ →
          </Link>
        </div>

        <div className="home-section-plain__visual">
          <span className="home-section-plain__stamp" aria-hidden="true">
            official profile
          </span>
          <img src={assets.diaryHeader.src} alt={assets.diaryHeader.alt} className="home-section-plain__image" />
        </div>
      </section>

      <section className="home-stream-plain fade-in-section" id="movie">
        <div className="home-stream-plain__copy">
          <p className="eyebrow">Movie / Stream</p>
          <p className="home-ambient-label">Stream / archive / update</p>
          <h2>配信はこちら</h2>
          <p>雑談や近況の話を中心に、無理のないペースで配信しています。気になったときに、ふらっと見に来てもらえたらうれしいです。</p>

          <ul className="home-stream-plain__list">
            {streamNotes.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <div className="home-stream-plain__links">
            {youtube ? (
              <a
                className="official-text-link"
                href={youtube.href}
                target={youtube.external ? '_blank' : undefined}
                rel={youtube.external ? 'noreferrer' : undefined}
              >
                YouTube を開く →
              </a>
            ) : null}
            {xLink ? (
              <a
                className="official-text-link"
                href={xLink.href}
                target={xLink.external ? '_blank' : undefined}
                rel={xLink.external ? 'noreferrer' : undefined}
              >
                X を見る →
              </a>
            ) : null}
          </div>
        </div>

        <div className="home-stream-plain__visual" aria-hidden="true">
          <p>STREAM MEMO</p>
          <span>雑談 / 近況 / ゆっくりめ</span>
          <span>配信後にアーカイブを整理</span>
          <span>DIARY あとで見返したいことを記録</span>
        </div>
      </section>

      <section className="home-connect-line fade-in-section" id="contact">
        <div>
          <p className="eyebrow">Connect</p>
          <p className="home-ambient-label">X / YouTube / update</p>
          <h2>更新先</h2>
        </div>

        <div className="home-connect-line__links">
          {socialLinks.map((item) => (
            <a
              key={item.label}
              className="home-connect-line__link"
              href={item.href}
              target={item.external ? '_blank' : undefined}
              rel={item.external ? 'noreferrer' : undefined}
            >
              <strong>{item.label}</strong>
              <span>{item.note}</span>
            </a>
          ))}
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
