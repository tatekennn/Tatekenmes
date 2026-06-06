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
    '最初は、短い雑談配信から始めるつもりです',
    'X にはその日のひとことを、日記にはもう少しまとまった話を書いています',
    '配信のアーカイブも、あとから見返しやすいように残していきます',
  ] as const;

  return (
    <SiteShell variant="home">
      <section className="home-hero-panel fade-in-section" id="top">
        <div className="home-hero-panel__visual">
          <img className="home-hero-panel__bg" src={assets.heroMain.src} alt={assets.heroMain.alt} />
          <div className="home-hero-panel__veil" aria-hidden="true" />
        </div>

        <div className="home-hero-panel__body">
          <div className="home-hero-panel__copy">
            <p className="eyebrow">Official site</p>
            <p className="home-hero-panel__ruby">{profile.ruby} / AMAGIRI MIO</p>
            <h1>平日のことと、帰り道のことを少しずつ残しています。</h1>
            <p className="home-hero-panel__summary">仕事のこと、その日に少し気になったこと、あとから見返したいと思ったこと。配信と日記に、無理のないペースで置いていくための場所です。</p>

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
          <p className="home-ambient-label">Observation archive / daylight memo</p>
          <h2>仕事のことと、普段のこと</h2>
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
            silent city archive
          </span>
          <img src={assets.diaryHeader.src} alt={assets.diaryHeader.alt} className="home-section-plain__image" />
        </div>
      </section>

      <section className="home-stream-plain fade-in-section" id="movie">
        <div className="home-stream-plain__copy">
          <p className="eyebrow">Movie / Stream</p>
          <p className="home-ambient-label">Tonight&apos;s route / stream entry / soft records</p>
          <h2>配信や記録の置き場所</h2>
          <p>配信では、その日にあったことや考えていたことを落ち着いて話せたらと思っています。日記と合わせて、あとから見返しやすい形にしていくつもりです。</p>

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
          <p>AFTER WORK ROUTE</p>
          <span>18:40 帰宅後にひと息</span>
          <span>22:00 配信メモを整理</span>
          <span>DIARY その日に残したいことだけ記録</span>
        </div>
      </section>

      <section className="home-connect-line fade-in-section" id="contact">
        <div>
          <p className="eyebrow">Connect</p>
          <p className="home-ambient-label">Signals / updates / small notices</p>
          <h2>いつもの更新先</h2>
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
