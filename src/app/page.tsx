import Link from 'next/link';
import { SiteShell } from '@/components/site-shell';
import { getLatestDiaryEntries } from '@/lib/diary';
import { siteData } from '@/content/site-data';

const quickLinks = [
  { label: 'プロフィール', href: '/profile', note: '輪郭を知る' },
  { label: '日記', href: '/diary', note: '今夜の記録へ' },
  { label: '世界観', href: '/world', note: '違和感の断片' },
] as const;

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

  return (
    <SiteShell variant="home">
      <section className="hero-card home-hero fade-in-section" id="top">
        <img className="home-hero__bg" src={assets.heroMain.src} alt={assets.heroMain.alt} />
        <div className="home-hero__veil" aria-hidden="true" />

        <div className="home-hero__content">
          <div className="home-hero__copy">
            <p className="eyebrow">AMAGIRI MIO OFFICIAL SITE</p>
            <p className="hero-ruby">{profile.ruby} / AMAGIRI MIO</p>
            <h1>天霧 澪</h1>
            <p className="hero-summary home-hero__summary">昼は静かに整え、夜は東京の違和感を観測するVTuber。</p>
            <p className="home-hero__lead">日記、配信準備、街に混じる小さな気配。その入口だけを、ここにまとめました。</p>

            <div className="hero-actions home-hero__actions">
              <Link className="pill-button" href="/diary">
                日記を読む
              </Link>
              <Link className="pill-button secondary" href="/profile">
                プロフィール
              </Link>
              {youtube ? (
                <a
                  className="pill-button secondary"
                  href={youtube.href}
                  target={youtube.external ? '_blank' : undefined}
                  rel={youtube.external ? 'noreferrer' : undefined}
                >
                  YouTube
                </a>
              ) : null}
            </div>
          </div>
        </div>

        <div className="home-hero__rail" aria-label="主要導線">
          {quickLinks.map((item) => (
            <Link key={item.href} href={item.href} className="home-hero__rail-link">
              <strong>{item.label}</strong>
              <span>{item.note}</span>
            </Link>
          ))}
          {socialLinks.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="home-hero__rail-link"
              target={item.external ? '_blank' : undefined}
              rel={item.external ? 'noreferrer' : undefined}
            >
              <strong>{item.label}</strong>
              <span>{item.note}</span>
            </a>
          ))}
        </div>
      </section>

      {latestEntry ? (
        <section className="section-card home-section fade-in-section" id="latest">
          <div className="section-card__header">
            <div>
              <p className="eyebrow">Latest</p>
              <h2>最新の記録</h2>
            </div>
            <Link className="official-text-link" href="/diary">
              日記一覧へ →
            </Link>
          </div>

          <article className="home-latest">
            <div className="home-latest__meta">
              <span>{latestEntry.date}</span>
              <span>{latestEntry.tags.slice(0, 2).join(' / ')}</span>
            </div>
            <h3>{latestEntry.title}</h3>
            <p>{latestEntry.excerpt}</p>
            <Link className="official-text-link" href={`/diary/${latestEntry.slug}`}>
              この日記を読む →
            </Link>
          </article>
        </section>
      ) : null}

      <section className="home-grid">
        <section className="section-card home-section fade-in-section" id="about">
          <div className="section-card__header">
            <div>
              <p className="eyebrow">About</p>
              <h2>澪について</h2>
            </div>
            <Link className="official-text-link" href="/profile">
              プロフィールへ →
            </Link>
          </div>

          <div className="home-about">
            <img src={assets.diaryHeader.src} alt={assets.diaryHeader.alt} className="home-about__image" />
            <div className="home-about__copy">
              {aboutParagraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <dl className="home-about__facts">
              {quickFacts.map((fact) => (
                <div key={fact.label} className="home-about__fact-row">
                  <dt>{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="section-card home-section fade-in-section" id="movie">
          <div className="section-card__header">
            <div>
              <p className="eyebrow">Movie / Stream</p>
              <h2>配信と映像</h2>
            </div>
          </div>

          <div className="home-guide-panel">
            <img
              src="/generated/mio-chibi-guide-20260606.png"
              alt="天霧澪のちびキャラ案内役。観測ノートを手にしたミニキャラ。"
              className="home-guide-panel__image"
            />
            <div className="home-guide-panel__body">
              <p className="home-guide-panel__eyebrow">Guide</p>
              <h3>ミニ澪がご案内</h3>
              <p>配信は YouTube にて準備中。夜の観測ログや短い雑談、街の温度が少しだけ変わる瞬間を、ここから辿れるようにしていきます。</p>
              <ul className="home-guide-panel__tags" aria-label="案内タグ">
                <li>配信準備中</li>
                <li>夜の観測ログ</li>
                <li>短い雑談</li>
              </ul>
              <div className="home-guide-panel__links">
                {youtube ? (
                  <a
                    className="pill-button secondary"
                    href={youtube.href}
                    target={youtube.external ? '_blank' : undefined}
                    rel={youtube.external ? 'noreferrer' : undefined}
                  >
                    YouTubeを見る
                  </a>
                ) : null}
                {xLink ? (
                  <a
                    className="official-text-link"
                    href={xLink.href}
                    target={xLink.external ? '_blank' : undefined}
                    rel={xLink.external ? 'noreferrer' : undefined}
                  >
                    X の短い観測メモへ →
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      </section>

      <section className="section-card home-section fade-in-section" id="contact">
        <div className="section-card__header">
          <div>
            <p className="eyebrow">SNS</p>
            <h2>つながる場所</h2>
          </div>
        </div>

        <div className="home-socials">
          {socialLinks.map((item) => (
            <a
              key={item.label}
              className="home-socials__link"
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
