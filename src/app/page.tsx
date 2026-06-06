import Link from 'next/link';
import { SiteShell } from '@/components/site-shell';
import { getLatestDiaryEntries } from '@/lib/diary';
import { siteData } from '@/content/site-data';

const entryLinks = [
  { label: 'PROFILE', href: '/profile' },
  { label: 'DIARY', href: '/diary' },
  { label: 'WORLD', href: '/world' },
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
  const tonightGuide = [
    {
      label: '今夜の温度',
      value: latestEntry ? latestEntry.tags.slice(0, 2).join(' / ') : '静かな観測モード',
    },
    {
      label: '入口',
      value: '長い記録は日記、短い温度は X へ',
    },
    {
      label: '配信準備',
      value: 'YouTube を中心に静かに整備中',
    },
  ] as const;
  const streamNotes = [
    '初回は短い雑談と観測ログ寄りで開始予定',
    'アーカイブも“夜の記録”として残せる構成に調整中',
    '日記・X・配信の役割が被りすぎない導線で整理',
  ] as const;

  return (
    <SiteShell variant="home">
      <section className="home-stage fade-in-section" id="top">
        <img className="home-stage__bg" src={assets.heroMain.src} alt={assets.heroMain.alt} />
        <div className="home-stage__veil" aria-hidden="true" />
        <div className="home-stage__glow" aria-hidden="true" />

        <div className="home-stage__content">
          <div className="home-stage__copy">
            <p className="home-stage__kicker">AMAGIRI MIO / OFFICIAL SITE</p>
            <p className="hero-ruby home-stage__ruby">{profile.ruby} / AMAGIRI MIO</p>
            <h1>天霧 澪</h1>
            <p className="hero-summary home-stage__summary">昼は静かに整え、夜は東京の違和感を観測するVTuber。</p>
            <p className="home-stage__lead">仕事帰りの光、ガラス越しのズレ、言葉にしきれない小さな気配。配信、日記、街の観測記録を、この場所にまとめています。</p>

            <div className="home-stage__actions">
              <Link className="pill-button" href="/diary">
                日記を読む
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

            <div className="home-stage__route" aria-label="主要導線">
              {entryLinks.map((item) => (
                <Link key={item.href} href={item.href} className="home-stage__route-link">
                  <span>{item.label}</span>
                </Link>
              ))}
              {socialLinks.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="home-stage__route-link"
                  target={item.external ? '_blank' : undefined}
                  rel={item.external ? 'noreferrer' : undefined}
                >
                  <span>{item.label}</span>
                </a>
              ))}
            </div>
          </div>

          <aside className="home-stage__note" aria-label="今夜の案内">
            <p className="home-stage__note-label">Tonight&apos;s note</p>
            <h2>配信前の小さな案内</h2>
            <p className="home-stage__note-copy">{siteData.featuredQuote}</p>
            <dl className="home-stage__note-list">
              {tonightGuide.map((item) => (
                <div key={item.label} className="home-stage__note-row">
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>
          </aside>
        </div>

        <div className="home-stage__scallop" aria-hidden="true" />
      </section>

      {latestEntry ? (
        <section className="home-news-strip fade-in-section" id="latest">
          <p className="home-news-strip__label">Latest entry</p>
          <div className="home-news-strip__body">
            <span className="home-news-strip__date">{latestEntry.date}</span>
            <strong>{latestEntry.title}</strong>
            <p>{latestEntry.excerpt}</p>
          </div>
          <Link className="official-text-link" href={`/diary/${latestEntry.slug}`}>
            この記録を読む →
          </Link>
        </section>
      ) : null}

      <section className="home-about-band fade-in-section" id="about">
        <div className="home-about-band__media">
          <img src={assets.diaryHeader.src} alt={assets.diaryHeader.alt} className="home-about-band__image" />
        </div>

        <div className="home-about-band__body">
          <p className="eyebrow">About</p>
          <h2>昼の輪郭と、夜の観測</h2>
          <div className="home-about-band__copy">
            {aboutParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          <dl className="home-about-band__facts">
            {quickFacts.map((fact) => (
              <div key={fact.label} className="home-about-band__fact">
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>

          <Link className="official-text-link" href="/profile">
            プロフィールへ →
          </Link>
        </div>
      </section>

      <section className="home-media-band fade-in-section" id="movie">
        <div className="home-media-band__guide">
          <img
            src="/generated/mio-chibi-guide-20260606.png"
            alt="天霧澪のちびキャラ案内役。観測ノートを手にしたミニキャラ。"
            className="home-media-band__chibi"
          />
          <div className="home-media-band__guide-copy">
            <p className="eyebrow">Movie / Stream</p>
            <h2>配信と映像の入口</h2>
            <p>配信は大きく騒ぐ場というより、夜の温度を少しだけ拾うための入口として整備中です。ちび澪が、配信と短い観測メモの行き先を案内します。</p>
            <div className="home-media-band__actions">
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
                  X の観測メモへ →
                </a>
              ) : null}
            </div>
          </div>
        </div>

        <aside className="home-media-band__status" aria-label="配信準備メモ">
          <p className="home-media-band__status-label">Stream memo</p>
          <h3>公開前の整え方</h3>
          <ul className="home-media-band__status-list">
            {streamNotes.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </aside>
      </section>

      <section className="home-social-band fade-in-section" id="contact">
        <div>
          <p className="eyebrow">Connect</p>
          <h2>更新の気配を追う場所</h2>
        </div>

        <div className="home-social-band__links">
          {socialLinks.map((item) => (
            <a
              key={item.label}
              className="home-social-band__link"
              href={item.href}
              target={item.external ? '_blank' : undefined}
              rel={item.external ? 'noreferrer' : undefined}
            >
              <span className="home-social-band__icon" aria-hidden="true">
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
