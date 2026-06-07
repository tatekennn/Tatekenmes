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

  return (
    <SiteShell variant="home">
      <section className="hero-v2 fade-in-section" id="top" aria-label="天霧澪 ホームヒーロー">
        <div className="hero-v2__visual" aria-hidden="true">
          <img className="hero-v2__image" src={assets.heroMain.src} alt="" />
        </div>

        <div className="hero-v2__shade" aria-hidden="true" />

        <div className="hero-v2__content">
          <div className="hero-v2__copy">
            <p className="hero-v2__ruby">{profile.ruby}</p>
            <h1>天霧 澪</h1>
            <p className="hero-v2__tagline">Juice=Juiceを知っていく日記VTuber</p>
            <p className="hero-v2__summary">
              きっかけは「プラトニック・プラネット」。知らない曲に出会うたび、
              感想と発見をここに残しています。
            </p>

            <div className="hero-v2__actions">
              <Link className="pill-button" href="/diary">
                最新の日記を読む
              </Link>
              <Link className="official-text-link" href="/profile">
                プロフィール →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {latestEntry ? (
        <section className="latest-line latest-line--home fade-in-section" id="latest" aria-labelledby="latest-title">
          <div className="latest-line__label">
            <p className="eyebrow">Latest</p>
            <h2 id="latest-title">最新の記録</h2>
          </div>
          <Link href={`/diary/${latestEntry.slug}`} className="latest-line__link">
            <span className="latest-line__date">{latestEntry.date}</span>
            <span className="latest-line__title">{latestEntry.title}</span>
            <span className="latest-line__arrow">→</span>
          </Link>
        </section>
      ) : null}

      <section className="about-v2 fade-in-section" id="about" aria-labelledby="about-title">
        <div className="about-v2__copy">
          <p className="eyebrow">About</p>
          <h2 id="about-title">まだ知らない曲があるから、書いています</h2>
          <p className="about-v2__lead">
            東京で働く26歳。最近Juice=Juiceにハマったばかりで、まずは曲とMVを知るところから始めています。
            このサイトは、天霧澪のプロフィールと日記をまとめた入口です。
          </p>
          <Link className="official-text-link" href="/profile">
            プロフィールを見る →
          </Link>
        </div>
        <dl className="about-v2__facts">
          {facts.map((fact) => (
            <div key={fact.label} className="about-v2__fact">
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {recentEntries.length ? (
        <section className="home-diary-strip fade-in-section" aria-labelledby="home-diary-title">
          <div className="home-diary-strip__heading">
            <p className="eyebrow">Diary</p>
            <h2 id="home-diary-title">最近の日記</h2>
          </div>
          <div className="home-diary-strip__list">
            {recentEntries.map((entry) => (
              <Link key={entry.slug} className="home-diary-strip__item" href={`/diary/${entry.slug}`}>
                <span>{entry.date}</span>
                <strong>{entry.title}</strong>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mio-guide-panel fade-in-section" aria-labelledby="guide-title">
        <div className="mio-guide-panel__visual" aria-hidden="true">
          <img src="/generated/mio-chibi-guide-20260606.png" alt="" />
        </div>
        <div className="mio-guide-panel__copy">
          <p className="eyebrow">Guide</p>
          <h2 id="guide-title">はじめて来た人へ</h2>
          <p>
            まずは最新の日記かプロフィールからどうぞ。Juice=Juiceを知っていく途中の感想を、澪のペースでまとめています。
          </p>
          <div className="mio-guide-panel__actions">
            <Link className="pill-button" href="/diary">日記を読む</Link>
            <Link className="official-text-link" href="/profile">澪について →</Link>
          </div>
        </div>
      </section>

      <section className="follow-v2 fade-in-section" id="contact" aria-labelledby="follow-title">
        <div className="follow-v2__inner">
          <div>
            <p className="eyebrow">Follow</p>
            <h2 id="follow-title">更新はこちらから</h2>
          </div>
          <div className="follow-v2__links">
            {xLink ? (
              <a
                className="follow-v2__link"
                href={xLink.href}
                target={xLink.external ? '_blank' : undefined}
                rel={xLink.external ? 'noreferrer' : undefined}
              >
                <span>Xを見る</span>
              </a>
            ) : null}
            <Link className="follow-v2__link" href="/diary">
              <span>日記一覧</span>
            </Link>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
