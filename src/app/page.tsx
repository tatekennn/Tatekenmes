import Link from 'next/link';
import { SiteShell } from '@/components/site-shell';
import { getLatestDiaryEntries } from '@/lib/diary';
import { siteData } from '@/content/site-data';

export default function HomePage() {
  const latestEntry = getLatestDiaryEntries(1)[0];
  const recentEntries = getLatestDiaryEntries(4).slice(1);
  const profile = siteData.profile;
  const assets = siteData.generatedAssets;
  const socials = siteData.socialLinks;
  const xLink = socials.find((item) => item.label.toLowerCase() === 'x') ?? socials[0];
  const facts = siteData.quickFacts.slice(0, 3);
  const newsItems = latestEntry ? [latestEntry, ...recentEntries].slice(0, 3) : recentEntries.slice(0, 3);

  return (
    <SiteShell variant="home">
      <section className="pop-home-hero fade-in-section" id="top" aria-label="天霧澪 ホームヒーロー">
        <div className="pop-home-hero__decor" aria-hidden="true">
          <span className="pop-home-hero__orb pop-home-hero__orb--pink" />
          <span className="pop-home-hero__orb pop-home-hero__orb--blue" />
          <span className="pop-home-hero__spark pop-home-hero__spark--one">♪</span>
          <span className="pop-home-hero__spark pop-home-hero__spark--two">✦</span>
          <span className="pop-home-hero__spark pop-home-hero__spark--three">Juice</span>
        </div>

        <div className="pop-home-hero__visual" aria-hidden="true">
          <img className="pop-home-hero__image" src={assets.heroMain.src} alt="" />
        </div>

        <div className="pop-home-hero__copy">
          <p className="pop-home-hero__site">AMAGIRI MIO OFFICIAL SITE</p>
          <p className="pop-home-hero__ruby">{profile.ruby}</p>
          <h1>天霧 澪</h1>
          <p className="pop-home-hero__tagline">Juice=Juiceを聴いて、書いて、好きになる。</p>
          <p className="pop-home-hero__summary">
            「プラトニック・プラネット」から始まった、まだ知らない曲に出会っていく日記とプロフィールをまとめています。
          </p>
          <div className="pop-home-hero__actions">
            <Link className="pill-button" href="/diary">
              最新の日記
            </Link>
            <Link className="official-text-link" href="/profile">
              Profile →
            </Link>
          </div>
        </div>

        <nav className="pop-route-rail" aria-label="ホーム内ショートカット">
          <a href="#news">NEWS</a>
          <a href="#about">ABOUT</a>
          <a href="#diary">DIARY</a>
          <a href="#contact">SNS</a>
        </nav>
      </section>

      {newsItems.length ? (
        <section className="pop-news-strip fade-in-section" id="news" aria-labelledby="news-title">
          <div className="pop-section-heading pop-section-heading--news">
            <span aria-hidden="true">NEWS</span>
            <p className="eyebrow">Information</p>
            <h2 id="news-title">お知らせと最新日記</h2>
          </div>
          <div className="pop-news-strip__list">
            {newsItems.map((entry, index) => (
              <Link key={entry.slug} className="pop-news-strip__item" href={`/diary/${entry.slug}`}>
                <span className="pop-news-strip__badge">{index === 0 ? 'NEW' : 'DIARY'}</span>
                <strong>{entry.title}</strong>
                <time>{entry.date}</time>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="pop-about-stage fade-in-section" id="about" aria-labelledby="about-title">
        <div className="pop-about-stage__image" aria-hidden="true">
          <img src={assets.profileIcon.src} alt="" />
        </div>
        <div className="pop-about-stage__copy">
          <p className="eyebrow">About</p>
          <h2 id="about-title">まだ知らない曲があるから、今日も開いています。</h2>
          <p>
            最近Juice=Juiceにハマった天霧澪の、日記とプロフィールの入口です。曲を聴いた日の温度や、MVで気になったところを、少しずつ残しています。
          </p>
          <div className="pop-about-stage__facts" aria-label="プロフィール要約">
            {facts.map((fact) => (
              <span key={fact.label}>
                <b>{fact.label}</b>
                {fact.value}
              </span>
            ))}
          </div>
        </div>
      </section>

      {recentEntries.length ? (
        <section className="pop-diary-flow fade-in-section" id="diary" aria-labelledby="diary-title">
          <div className="pop-section-heading">
            <span aria-hidden="true">DIARY</span>
            <p className="eyebrow">Music log</p>
            <h2 id="diary-title">最近の記録</h2>
          </div>
          <div className="pop-diary-flow__timeline">
            {recentEntries.map((entry, index) => (
              <Link key={entry.slug} className="pop-diary-flow__item" href={`/diary/${entry.slug}`}>
                <span className="pop-diary-flow__num">0{index + 1}</span>
                <strong>{entry.title}</strong>
                <time>{entry.date}</time>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="pop-guide-band fade-in-section" aria-labelledby="guide-title">
        <div className="pop-guide-band__visual" aria-hidden="true">
          <img src="/generated/mio-chibi-guide-20260606.png" alt="" />
        </div>
        <div className="pop-guide-band__copy">
          <p className="eyebrow">Guide</p>
          <h2 id="guide-title">はじめて来た人へ</h2>
          <p>まずは日記、もう少し知りたくなったらプロフィールへ。公式サイトらしく、入口は少なく、迷わないように整理しました。</p>
        </div>
        <div className="pop-guide-band__links">
          <Link href="/diary">日記を読む</Link>
          <Link href="/profile">澪について</Link>
        </div>
      </section>

      <section className="pop-follow-dock fade-in-section" id="contact" aria-labelledby="follow-title">
        <p className="eyebrow">Follow</p>
        <h2 id="follow-title">更新はこちらから</h2>
        <div className="pop-follow-dock__links">
          {xLink ? (
            <a href={xLink.href} target={xLink.external ? '_blank' : undefined} rel={xLink.external ? 'noreferrer' : undefined}>
              <span>{xLink.icon}</span>
              Xを見る
            </a>
          ) : null}
          <Link href="/diary">日記一覧</Link>
        </div>
      </section>
    </SiteShell>
  );
}
