import Link from 'next/link';
import { SiteShell } from '@/components/site-shell';
import { getLatestDiaryEntries } from '@/lib/diary';
import { siteData } from '@/content/site-data';

const heroLinks = [
  { label: 'PROFILE', href: '/profile', external: false },
  { label: 'DIARY', href: '/diary', external: false },
  { label: 'WORLD', href: '/world', external: false },
] as const;

export default function HomePage() {
  const latestEntry = getLatestDiaryEntries(1)[0];
  const profile = siteData.profile;
  const assets = siteData.generatedAssets;
  const socials = siteData.socialLinks;
  const youtube = socials.find((item) => item.label.toLowerCase().includes('youtube')) ?? socials[0];
  const xLink = socials.find((item) => item.label.toLowerCase() === 'x') ?? socials[1] ?? socials[0];
  const heroSocials = [youtube, xLink].filter((item, index, arr): item is NonNullable<typeof item> => Boolean(item) && arr.indexOf(item) === index);
  const aboutParagraphs = profile.bio.slice(0, 3);

  return (
    <SiteShell variant="home">
      <section className="official-hero official-hero--minimal" id="top">
        <div className="official-hero__backdrop" style={{ backgroundImage: `url(${assets.heroMain.src})` }} />
        <div className="official-hero__texture" aria-hidden="true" />
        <div className="official-hero__cityline" aria-hidden="true" />
        <div className="official-hero__orb official-hero__orb--one" aria-hidden="true" />
        <div className="official-hero__orb official-hero__orb--two" aria-hidden="true" />

        <div className="official-hero__content official-hero__content--minimal">
          <div className="official-hero__copy official-hero__copy--minimal fade-in-section">
            <p className="official-kicker">AMAGIRI MIO OFFICIAL SITE</p>
            <p className="official-ruby">{profile.ruby} / AMAGIRI MIO</p>
            <h1 className="official-title">天霧 澪</h1>
            <p className="official-tagline official-tagline--minimal">東京の夜を観測するVTuber</p>

            <div className="official-hero__actions official-hero__actions--minimal">
              <Link className="official-button" href="/diary">
                日記を読む
              </Link>
              {youtube ? (
                <a
                  className="official-button official-button--ghost"
                  href={youtube.href}
                  target={youtube.external ? '_blank' : undefined}
                  rel={youtube.external ? 'noreferrer' : undefined}
                >
                  YouTube
                </a>
              ) : null}
            </div>
          </div>

          <div className="official-hero__visual official-hero__visual--minimal fade-in-section">
            <div className="official-hero__figure-wrap official-hero__figure-wrap--minimal">
              <img className="official-hero__figure official-hero__figure--minimal" src={assets.profileFull.src} alt={assets.profileFull.alt} />
            </div>
          </div>
        </div>
      </section>

      <section className="official-shortcuts fade-in-section" aria-label="主要導線">
        <div className="official-shortcuts__links">
          {heroLinks.map((item) => (
            <Link key={item.label} href={item.href} className="official-shortcuts__link">
              {item.label}
            </Link>
          ))}

          {heroSocials.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="official-shortcuts__link"
              target={item.external ? '_blank' : undefined}
              rel={item.external ? 'noreferrer' : undefined}
            >
              {item.label.toUpperCase()}
            </a>
          ))}
        </div>
      </section>

      {latestEntry ? (
        <section className="official-latest fade-in-section" id="latest">
          <div className="official-section-heading">
            <p className="official-section-heading__index">01</p>
            <div>
              <p className="official-kicker">Latest</p>
              <h2 className="official-section-title">最新の記録</h2>
            </div>
          </div>

          <article className="official-latest__card">
            <div className="official-latest__meta">
              <span>{latestEntry.date}</span>
              <span>{latestEntry.tags.slice(0, 2).join(' / ')}</span>
            </div>
            <h3>{latestEntry.title}</h3>
            <p>{latestEntry.excerpt}</p>
            <div className="official-latest__actions">
              <Link className="official-text-link" href={`/diary/${latestEntry.slug}`}>
                この日記を読む →
              </Link>
              <Link className="official-button official-button--soft" href="/diary">
                日記をすべて見る →
              </Link>
            </div>
          </article>
        </section>
      ) : null}

      <section className="official-about official-about--minimal fade-in-section" id="about">
        <div className="official-section-heading">
          <p className="official-section-heading__index">02</p>
          <div>
            <p className="official-kicker">About</p>
            <h2 className="official-section-title">静かな夜の入口</h2>
          </div>
        </div>

        <div className="official-about__layout official-about__layout--minimal">
          <div className="official-about__portrait official-about__portrait--minimal">
            <img src={assets.diaryHeader.src} alt={assets.diaryHeader.alt} className="official-about__portrait-image" />
          </div>

          <div className="official-about__copy official-about__copy--minimal">
            {aboutParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            <Link className="official-text-link" href="/profile">
              プロフィールを見る →
            </Link>
          </div>
        </div>
      </section>

      <section className="official-movie official-movie--minimal fade-in-section" id="movie">
        <div className="official-movie__visual official-movie__visual--minimal" style={{ backgroundImage: `url(${assets.heroMain.src})` }}>
          <div className="official-movie__veil" />
          <div className="official-movie__copy official-movie__copy--minimal">
            <div className="official-section-heading official-section-heading--light">
              <p className="official-section-heading__index">03</p>
              <div>
                <p className="official-kicker">Movie / Stream</p>
                <h2 className="official-section-title">配信と映像</h2>
              </div>
            </div>

            <p>配信は YouTube にて準備中。夜の観測ログや短い雑談を、静かな温度で届けていく予定です。</p>

            {youtube ? (
              <a
                className="official-button"
                href={youtube.href}
                target={youtube.external ? '_blank' : undefined}
                rel={youtube.external ? 'noreferrer' : undefined}
              >
                YouTubeを見る
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <section className="official-contact official-contact--compact fade-in-section" id="contact">
        <div className="official-section-heading">
          <p className="official-section-heading__index">04</p>
          <div>
            <p className="official-kicker">SNS</p>
            <h2 className="official-section-title">つながる場所</h2>
          </div>
        </div>

        <div className="official-contact__compact-links">
          {heroSocials.map((item) => (
            <a
              key={item.label}
              className="official-contact__compact-link"
              href={item.href}
              target={item.external ? '_blank' : undefined}
              rel={item.external ? 'noreferrer' : undefined}
            >
              <span className="official-contact__icon" aria-hidden="true">
                {item.icon}
              </span>
              <span>
                <strong>{item.label}</strong>
                <small>{item.note}</small>
              </span>
            </a>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
