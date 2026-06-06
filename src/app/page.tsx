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
    '初回は短い雑談と観測ログ寄りで開始予定',
    'X は短い観測メモ、日記は長い記録として整理',
    '配信アーカイブも“夜の観測記録”として残す想定',
  ] as const;

  return (
    <SiteShell variant="home">
      <section className="home-kv fade-in-section" id="top">
        <img className="home-kv__bg" src={assets.heroMain.src} alt={assets.heroMain.alt} />
        <div className="home-kv__veil" aria-hidden="true" />

        <div className="home-kv__content">
          <div className="home-kv__copy">
            <p className="home-kv__eyebrow">AMAGIRI MIO / OFFICIAL SITE</p>
            <p className="home-kv__ruby">{profile.ruby} / AMAGIRI MIO</p>
            <h1>天霧 澪</h1>
            <p className="home-kv__summary">昼は静かに整え、夜は東京の違和感を観測するVTuber。</p>
            <p className="home-kv__lead">仕事帰りの光、ガラス越しのズレ、言葉にしきれない小さな気配。配信、日記、街の観測記録を、この場所にまとめています。</p>

            <div className="home-kv__actions">
              <Link className="pill-button" href="/diary">
                日記を読む
              </Link>
              {youtube ? (
                <a
                  className="home-kv__sub-link"
                  href={youtube.href}
                  target={youtube.external ? '_blank' : undefined}
                  rel={youtube.external ? 'noreferrer' : undefined}
                >
                  YouTube →
                </a>
              ) : null}
              {xLink ? (
                <a
                  className="home-kv__sub-link"
                  href={xLink.href}
                  target={xLink.external ? '_blank' : undefined}
                  rel={xLink.external ? 'noreferrer' : undefined}
                >
                  X →
                </a>
              ) : null}
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
            Read diary →
          </Link>
        </section>
      ) : null}

      <section className="home-section-plain home-section-plain--about fade-in-section" id="about">
        <div className="home-section-plain__copy">
          <p className="eyebrow">About</p>
          <h2>昼の輪郭と、夜の観測</h2>
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
          <img src={assets.diaryHeader.src} alt={assets.diaryHeader.alt} className="home-section-plain__image" />
        </div>
      </section>

      <section className="home-stream-plain fade-in-section" id="movie">
        <div className="home-stream-plain__copy">
          <p className="eyebrow">Movie / Stream</p>
          <h2>配信と映像の入口</h2>
          <p>配信は大きく騒ぐ場というより、夜の温度を少しだけ拾うための入口として整備中です。短い雑談、観測ログ、アーカイブの導線を静かに揃えています。</p>

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
                X の観測メモへ →
              </a>
            ) : null}
          </div>
        </div>

        <img
          src="/generated/mio-chibi-guide-20260606.png"
          alt="天霧澪のちびキャラ案内役。観測ノートを手にしたミニキャラ。"
          className="home-stream-plain__chibi"
        />
      </section>

      <section className="home-connect-line fade-in-section" id="contact">
        <div>
          <p className="eyebrow">Connect</p>
          <h2>更新の気配を追う場所</h2>
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
      </section>
    </SiteShell>
  );
}
