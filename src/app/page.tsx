import Link from 'next/link';
import { SiteShell } from '@/components/site-shell';
import { formatMoodLabel, getLatestDiaryEntries } from '@/lib/diary';
import { siteData } from '@/content/site-data';

const sectionIndex = [
  { label: 'News', href: '#news', note: '今夜のお知らせ' },
  { label: 'About', href: '#about', note: '人物紹介' },
  { label: 'Diary', href: '#diary', note: '夜の観察日記' },
  { label: 'Movie', href: '#movie', note: '配信 / 映像' },
  { label: 'Contact', href: '#contact', note: 'SNS / Contact' },
] as const;

const personalLines = [
  '今日も終電、ありがとうございました。',
  '昼に整えたことが、夜の静けさを少しだけ助ける気がしています。',
  '見過ごせる違和感ほど、あとからやさしく残ります。',
  '更新というより、今夜の小さな近況だと思ってもらえたらうれしいです。',
] as const;

export default function HomePage() {
  const latestEntries = getLatestDiaryEntries(4);
  const profile = siteData.profile;
  const assets = siteData.generatedAssets;
  const featuredQuote = siteData.featuredQuote;
  const facts = siteData.quickFacts;
  const socials = siteData.socialLinks;
  const leadEntry = latestEntries[0];
  const trailEntries = latestEntries.slice(1);

  return (
    <SiteShell variant="home">
      <section className="official-hero" id="top">
        <div className="official-hero__backdrop" style={{ backgroundImage: `url(${assets.heroMain.src})` }} />
        <div className="official-hero__texture" aria-hidden="true" />
        <div className="official-hero__cityline" aria-hidden="true" />

        <div className="official-hero__content">
          <div className="official-hero__copy fade-in-section">
            <p className="official-kicker">AMAGIRI MIO OFFICIAL SITE</p>
            <p className="official-ruby">{profile.ruby} / AMAGIRI MIO</p>
            <h1 className="official-title">天霧 澪</h1>
            <p className="official-tagline">昼はオフィスワーカー、夜は都市の違和感を観測するVTuber。</p>
            <p className="official-summary">平日の延長線にある静かな夜を、少しだけ物語に変えて届けます。</p>

            <div className="official-pills" aria-label="コンセプト要約">
              <span>Reality {profile.worldRatio.reality}%</span>
              <span>Occult {profile.worldRatio.occult}%</span>
              <span>Tokyo office nocturne</span>
            </div>

            <blockquote className="official-hero__quote">「{featuredQuote}」</blockquote>

            <div className="official-hero__actions">
              <Link className="official-button" href="#diary">
                夜の観察日記へ
              </Link>
              <Link className="official-text-link" href="/profile">
                PROFILEを見る
              </Link>
            </div>

            <p className="official-hero__line">{personalLines[0]}</p>
          </div>

          <div className="official-hero__visual fade-in-section">
            <div className="official-hero__figure-wrap">
              <img className="official-hero__figure" src={assets.profileFull.src} alt={assets.profileFull.alt} />
            </div>

            <div className="official-hero__sidecard official-hero__sidecard--status">
              <span className="official-sidecard__label">Tonight's memo</span>
              <strong>退勤後の街は、少しだけ観測対象になる。</strong>
              <p>ガラス、雨上がり、終電前のホーム。説明しきれない差分だけを、澪は静かに拾っていきます。</p>
            </div>

            <nav className="official-section-rail" aria-label="トップセクション案内">
              {sectionIndex.map((item, index) => (
                <Link key={item.href} href={item.href} className="official-section-rail__item">
                  <span className="official-section-rail__count">{String(index + 1).padStart(2, '0')}</span>
                  <span className="official-section-rail__body">
                    <strong>{item.label}</strong>
                    <small>{item.note}</small>
                  </span>
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </section>

      <section className="official-news fade-in-section" id="news">
        <div className="official-section-heading">
          <p className="official-section-heading__index">01</p>
          <div>
            <p className="official-kicker">News</p>
            <h2 className="official-section-title">今夜のお知らせ</h2>
          </div>
        </div>

        <div className="official-news__layout">
          <div className="official-news__lead">
            <p className="official-news__line">{personalLines[1]}</p>
            <p className="official-news__subline">{personalLines[3]}</p>
            <p>
              大きな発表よりも、今週見つけた気配や、配信前に胸の内へ残った一文を先に置いておく場所です。
            </p>
          </div>

          {leadEntry ? (
            <div className="official-news__broadcast">
              <p className="official-kicker">Broadcast note</p>
              <div className="official-news__broadcast-meta">
                <span>{leadEntry.date}</span>
                <span>{formatMoodLabel(leadEntry.mood)}</span>
              </div>
              <h3>{leadEntry.title}</h3>
              <p>{leadEntry.excerpt}</p>
              <Link className="official-text-link" href={`/diary/${leadEntry.slug}`}>
                つづきを読む
              </Link>

              <div className="official-news__micro-list" role="list" aria-label="最近のひとこと">
                {trailEntries.map((entry) => (
                  <Link key={entry.slug} href={`/diary/${entry.slug}`} className="official-news__micro-item">
                    <div>
                      <strong>{entry.title}</strong>
                      <small>{entry.date}</small>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="official-about fade-in-section" id="about">
        <div className="official-section-heading">
          <p className="official-section-heading__index">02</p>
          <div>
            <p className="official-kicker">About</p>
            <h2 className="official-section-title">天霧 澪という人</h2>
          </div>
        </div>

        <div className="official-about__layout">
          <div className="official-about__portrait" style={{ backgroundImage: `url(${assets.diaryHeader.src})` }}>
            <div className="official-about__portrait-copy">
              <p className="official-kicker">Quiet office / quiet night</p>
              <p>{personalLines[2]}</p>
            </div>
          </div>

          <div className="official-about__copy">
            <p className="official-drop">
              昼は、目立たないまま物事を整える人。夜は、都内の景色に残るごく小さな揺れを見逃さない人。
              天霧澪の魅力は「大事件」ではなく、誰もが知っている平日をほんの少しだけ深く見つめる視線にあります。
            </p>

            <div className="official-about__body">
              {profile.bio.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>

            <dl className="official-about__facts">
              {facts.map((fact) => (
                <div key={fact.label} className="official-about__fact">
                  <dt>{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section className="official-diary fade-in-section" id="diary">
        <div className="official-section-heading">
          <p className="official-section-heading__index">03</p>
          <div>
            <p className="official-kicker">Diary</p>
            <h2 className="official-section-title">夜の観察日記</h2>
          </div>
        </div>

        <div className="official-diary__layout">
          {leadEntry ? (
            <article className="official-diary__featured">
              <p className="official-kicker">Latest note</p>
              <div className="official-diary__meta">
                <span>{leadEntry.date}</span>
                <span>{formatMoodLabel(leadEntry.mood)}</span>
                <span>{leadEntry.tags.join(' / ')}</span>
              </div>
              <h3>{leadEntry.title}</h3>
              <p className="official-diary__voice">「今夜の帰り道で、少しだけ足を止めた理由です。」</p>
              <p className="official-diary__excerpt">{leadEntry.excerpt}</p>
              {leadEntry.body.slice(0, 2).map((paragraph) => (
                <p key={paragraph} className="official-diary__paragraph">
                  {paragraph}
                </p>
              ))}
              <Link className="official-text-link" href={`/diary/${leadEntry.slug}`}>
                この記録を読む
              </Link>
            </article>
          ) : null}

          <div className="official-diary__fragments" aria-label="最近の観測断章">
            <p className="official-diary__timeline-lead">駅のホーム、コンビニの湯気、雨上がりの舗道。短い出来事だけを細く残しています。</p>
            {trailEntries.map((entry) => (
              <Link key={entry.slug} href={`/diary/${entry.slug}`} className="official-diary__fragment">
                <p>{entry.body[0] ?? entry.excerpt}</p>
                <div className="official-diary__fragment-meta">
                  <strong>{entry.title}</strong>
                  <small>{entry.date} / {entry.tags.slice(0, 2).join(' / ')}</small>
                </div>
              </Link>
            ))}

            <Link className="official-diary__archive-link" href="/diary">
              すべての記録を見る
            </Link>
          </div>
        </div>
      </section>

      <section className="official-movie fade-in-section" id="movie">
        <div className="official-movie__visual" style={{ backgroundImage: `url(${assets.diaryDecor.src})` }}>
          <div className="official-movie__veil" />
          <div className="official-movie__copy">
            <div className="official-section-heading official-section-heading--light">
              <p className="official-section-heading__index">04</p>
              <div>
                <p className="official-kicker">Movie / Stream</p>
                <h2 className="official-section-title">配信と映像のための余白</h2>
              </div>
            </div>

            <p>
              ここは将来的に、配信アーカイブや短い映像、ボイス付きの記録を置くための場所です。いまはまだ静かですが、
              「夜の街を歩くように見られるコンテンツ」が入る前提で席を確保しています。
            </p>

            <div className="official-movie__panel">
              <strong>Coming soon</strong>
              <p>夜の観測ログ / 配信アーカイブ / short movie placeholder</p>
              <Link className="official-text-link official-text-link--light" href="/world">
                先に世界観をみる
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="official-contact fade-in-section" id="contact">
        <div className="official-section-heading">
          <p className="official-section-heading__index">05</p>
          <div>
            <p className="official-kicker">SNS / Contact</p>
            <h2 className="official-section-title">澪の夜へつながる入口</h2>
          </div>
        </div>

        <div className="official-contact__layout">
          <div className="official-contact__statement">
            <p>
              もし、平日の終わりに少しだけ寄り道したくなったら。配信でも日記でも、覗きやすい入口からどうぞ。
            </p>
            <p className="official-contact__small">SNSのURLはプレースホルダーです。後から本アカウントへ差し替えられます。</p>
          </div>

          <div className="official-contact__links">
            {socials.map((item) => (
              <a
                key={item.label}
                className="official-contact__link"
                href={item.href}
                target={item.external ? '_blank' : undefined}
                rel={item.external ? 'noreferrer' : undefined}
              >
                <span className="official-contact__icon" aria-hidden="true">{item.icon}</span>
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.note}</small>
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
