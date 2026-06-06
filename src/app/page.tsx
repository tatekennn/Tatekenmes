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
  const socialLinks = [xLink].filter((item, index, arr): item is NonNullable<typeof item> => Boolean(item) && arr.indexOf(item) === index);
  const aboutParagraphs = profile.bio.slice(0, 2);
  const quickFacts = siteData.quickFacts.slice(0, 3);
  const streamNotes = [
    '「プラトニック・プラネット」から入って、他の曲も少しずつ聴いています',
    'X では短い反応やメモ、日記ではもう少し長めの話を書いています',
    '知らない曲に出会うたびに「なんで今まで聴かなかった」と思います',
  ] as const;

  return (
    <SiteShell variant="home">
      <section className="home-hero-panel fade-in-section" id="top">
        <div className="home-hero-panel__visual">
          <img className="home-hero-panel__bg" src={assets.heroMain.src} alt={assets.heroMain.alt} />
          <div className="home-hero-panel__veil" aria-hidden="true" />

          <div className="home-hero-panel__body">
            <div className="home-hero-panel__copy">
              <p className="eyebrow">Juice=Juice 日報</p>
              <p className="home-hero-panel__ruby">{profile.ruby} / AMAGIRI MIO</p>
              <h1>最近Juice=Juiceにハマりました。</h1>
              <p className="home-hero-panel__summary">「プラトニック・プラネット」から入って、他の曲も少しずつ聴いています。知らない曲に出会うたびに、ここに書いています。</p>

              <div className="home-hero-panel__actions">
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

              <div className="home-hero-panel__route" aria-label="主要導線">
                <Link href="/profile">PROFILE</Link>
                <Link href="/diary#latest">LATEST</Link>
                <Link href="/diary">DIARY</Link>
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
          <p className="home-ambient-label">About / Juice=Juice / newcomer</p>
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
          <p className="eyebrow">Diary / Memo</p>
          <p className="home-ambient-label">Juice=Juice / 発見 / メモ</p>
          <h2>Juice=Juiceのことを、少しずつ</h2>
          <p>最近ハマったばかりで、知らない曲がまだたくさんあります。ひとつ見つけるたびに、ここに書いていきます。</p>

          <ul className="home-stream-plain__list">
            {streamNotes.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <div className="home-stream-plain__links">
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
          <p>JUICE=JUICE</p>
          <span>プラトニック・プラネット</span>
          <span>知らない曲との出会い</span>
          <span>DIARY ひとつずつ記録していく</span>
        </div>
      </section>

      <section className="home-connect-line fade-in-section" id="contact">
        <div>
          <p className="eyebrow">Connect</p>
          <p className="home-ambient-label">X / Juice=Juice日記</p>
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
