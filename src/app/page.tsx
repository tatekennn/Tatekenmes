import Link from 'next/link';
import { SiteShell } from '@/components/site-shell';
import { getLatestDiaryEntries } from '@/lib/diary';
import { siteData } from '@/content/site-data';

export default function HomePage() {
  const latestEntry = getLatestDiaryEntries(1)[0];
  const profile = siteData.profile;
  const assets = siteData.generatedAssets;
  const socials = siteData.socialLinks;
  const xLink = socials.find((item) => item.label.toLowerCase() === 'x') ?? socials[0];

  return (
    <SiteShell variant="home">
      {/* Hero: キャラクターを全面に出し、テキストは最小限 */}
      <section className="hero-v2 fade-in-section" id="top">
        <div className="hero-v2__visual">
          <img
            className="hero-v2__image"
            src={assets.heroMain.src}
            alt={assets.heroMain.alt}
          />
        </div>
        
        <div className="hero-v2__content">
          <div className="hero-v2__copy">
            <p className="hero-v2__ruby">{profile.ruby}</p>
            <h1>天霧 澪</h1>
            <p className="hero-v2__tagline">Juice=Juiceを聴き始めた社会人</p>
            
            <div className="hero-v2__actions">
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
          </div>
          
          <nav className="hero-v2__nav" aria-label="主要導線">
            <Link href="/profile">PROFILE</Link>
            <Link href="/diary">DIARY</Link>
            <Link href="/world">WORLD</Link>
          </nav>
        </div>
      </section>

      {/* Latest: 最新日記を一行で表示 */}
      {latestEntry ? (
        <section className="latest-line fade-in-section" id="latest">
          <Link href={`/diary/${latestEntry.slug}`} className="latest-line__link">
            <span className="latest-line__date">{latestEntry.date}</span>
            <span className="latest-line__title">{latestEntry.title}</span>
            <span className="latest-line__arrow">→</span>
          </Link>
        </section>
      ) : null}

      {/* About: 最小限のナラティブだけ */}
      <section className="about-v2 fade-in-section" id="about">
        <div className="about-v2__copy">
          <p className="eyebrow">About</p>
          <p className="about-v2__lead">
            東京で働く26歳。Juice=Juiceの「プラトニック・プラネット」に惹かれて、
            アイドルを観測し始めました。知らない曲に出会うたび、ここに記録しています。
          </p>
          <Link className="official-text-link" href="/profile">
            プロフィール →
          </Link>
        </div>
      </section>

      {/* Follow: コンパクトなリンク */}
      <section className="follow-v2 fade-in-section" id="contact">
        <div className="follow-v2__inner">
          <p className="eyebrow">Follow</p>
          <div className="follow-v2__links">
            {xLink ? (
              <a
                className="follow-v2__link"
                href={xLink.href}
                target={xLink.external ? '_blank' : undefined}
                rel={xLink.external ? 'noreferrer' : undefined}
              >
                <span>X</span>
              </a>
            ) : null}
            <Link className="follow-v2__link" href="/diary">
              <span>日記</span>
            </Link>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
