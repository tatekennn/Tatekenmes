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
    <SiteShell variant="home" activeHref="/">
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
          <p className="pop-home-hero__site">AMAGIRI MIO JUICE=JUICE GUIDE</p>
          <p className="pop-home-hero__ruby">{profile.ruby}</p>
          <h1>天霧 澪</h1>
          <p className="pop-home-hero__tagline">Juice=Juiceの魅力を、好きになる入口まで届けます。</p>
          <p className="pop-home-hero__summary">
            公式情報やメンバーのプロフィール、楽曲の手がかりを調べて、初めて見る人にも届く短い要点と少し詳しいガイドに整えています。
          </p>
          <div className="pop-home-hero__actions">
            <Link className="pill-button" href="/diary">
              最新ガイドを見る
            </Link>
            <Link className="official-text-link" href="/profile">
              天霧澪について →
            </Link>
          </div>
        </div>

        <nav className="pop-route-rail" aria-label="ホーム内ショートカット">
          <a href="#news">NEW</a>
          <a href="#about">ABOUT</a>
          <a href="#diary">GUIDE</a>
          <a href="#contact">SNS</a>
        </nav>
      </section>

      <section className="pop-about-stage pop-about-stage--priority fade-in-section" id="about" aria-labelledby="about-title">
        <div className="pop-about-stage__image" aria-hidden="true">
          <img src={assets.profileIcon.src} alt="" />
        </div>
        <div className="pop-about-stage__copy">
          <p className="eyebrow">Profile / Guide</p>
          <h2 id="about-title">天霧澪による、Juice=Juice案内サイトです。</h2>
          <p>
            天霧澪は、Juice=Juiceの魅力をもっと多くの人に届けるための案内係です。公式情報や複数ソースを確認しながら、初めて見る人が覚えやすい順番と、少し人間らしい引っかかりを添えてまとめます。
          </p>
          <div className="pop-about-stage__facts" aria-label="サイト方針の要約">
            {facts.map((fact) => (
              <span key={fact.label}>
                <b>{fact.label}</b>
                {fact.value}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="pop-guide-band pop-guide-band--priority fade-in-section" aria-labelledby="guide-title">
        <div className="pop-guide-band__visual" aria-hidden="true">
          <img src="/generated/mio-chibi-guide-20260606.png" alt="" />
        </div>
        <div className="pop-guide-band__copy">
          <p className="eyebrow">First entry</p>
          <h2 id="guide-title">はじめての入口を、ここにまとめます。</h2>
          <p>メンバー、名前の由来、楽曲の聴きどころなど、最初に覚えやすい順番からどうぞ。短いX向けまとめの元になる、少し詳しいガイドを置いています。</p>
        </div>
        <div className="pop-guide-band__links">
          <Link href="/diary">入門ガイドを見る</Link>
          <Link href="/profile">プロフィール</Link>
        </div>
      </section>

      {newsItems.length ? (
        <section className="pop-news-strip fade-in-section" id="news" aria-labelledby="news-title">
          <div className="pop-section-heading pop-section-heading--news">
            <span aria-hidden="true">GUIDE</span>
            <p className="eyebrow">Latest update</p>
            <h2 id="news-title">最新ガイド</h2>
          </div>
          <div className="pop-news-strip__list">
            {newsItems.map((entry, index) => (
              <Link key={entry.slug} className="pop-news-strip__item" href={`/diary/${entry.slug}`}>
                <span className="pop-news-strip__badge">{index === 0 ? 'NEW' : 'GUIDE'}</span>
                <strong>{entry.title}</strong>
                <p>{entry.excerpt}</p>
                <time>{entry.date}</time>
                <em aria-hidden="true">Read guide →</em>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {recentEntries.length ? (
        <section className="pop-diary-flow fade-in-section" id="diary" aria-labelledby="diary-title">
          <div className="pop-section-heading">
            <span aria-hidden="true">ARCHIVE</span>
            <p className="eyebrow">Research archive</p>
            <h2 id="diary-title">リサーチアーカイブ</h2>
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
          <div className="pop-diary-flow__more">
            <Link href="/diary">すべてのガイドを見る</Link>
          </div>
        </section>
      ) : null}

      <section className="pop-follow-dock fade-in-section" id="contact" aria-labelledby="follow-title">
        <p className="eyebrow">Follow / Updates</p>
        <h2 id="follow-title">更新情報と短いまとめを受け取る</h2>
        <div className="pop-follow-dock__links">
          {xLink ? (
            <a href={xLink.href} target={xLink.external ? '_blank' : undefined} rel={xLink.external ? 'noreferrer' : undefined}>
              <span aria-hidden="true">{xLink.icon}</span>
              Xで短く読む
            </a>
          ) : null}
          <Link href="/diary">ガイド一覧</Link>
        </div>
      </section>
    </SiteShell>
  );
}
