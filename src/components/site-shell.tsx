import Link from 'next/link';
import type { ReactNode } from 'react';
import { AmbientOrb } from '@/components/ambient-orb';
import { siteData } from '@/content/site-data';

const fallbackNav = [
  { href: '/', label: 'ホーム' },
  { href: '/diary', label: 'ガイド' },
  { href: '/profile', label: 'プロフィール' },
];

function getNavItems() {
  const raw = Array.isArray(siteData.navigation) ? siteData.navigation : fallbackNav;

  return raw
    .map((item) => ({
      href: typeof item.href === 'string' ? item.href : '/',
      label: typeof item.label === 'string' ? item.label : 'リンク',
    }))
    .filter((item: { href: string; label: string }) => item.href && item.label);
}

type SiteShellProps = Readonly<{
  children: ReactNode;
  variant?: 'default' | 'home';
  activeHref?: string;
}>;

export function SiteShell({ children, variant = 'default', activeHref = '/' }: SiteShellProps) {
  const navItems = getNavItems();
  const name = siteData.profile.name;
  const subtitle = variant === 'home' ? 'Juice=Juice 案内ノート' : 'Juice=Juice / guide / profile';
  const socialLinks = Array.isArray(siteData.socialLinks) ? siteData.socialLinks.slice(0, 2) : [];
  const showHeaderSocials = variant !== 'home';

  return (
    <main className={`site-shell site-shell--${variant}`}>
      <AmbientOrb />
      <div className="site-shell__inner">
        <header className="site-header">
          <div className={`site-brand ${variant === 'home' ? 'site-brand--home' : ''}`}>
            {variant === 'home' ? (
              <Link href="/" className="site-brand__logo-link" aria-label={`${name} オフィシャルサイト トップへ`}>
                <img
                  src="/generated/amagiri-mio-logo-ai-clean.png"
                  alt="天霧澪 オフィシャルサイト ロゴ"
                  className="site-brand__logo"
                />
              </Link>
            ) : (
              <>
                <p className="site-note">AMAGIRI MIO OFFICIAL SITE</p>
                <strong>{name}</strong>
                <span>{subtitle}</span>
              </>
            )}
          </div>

          <div className="site-header__cluster">
            <nav className="site-nav site-nav--desktop" aria-label="主要ナビゲーション">
              {navItems.map((item) => (
                <Link key={`${item.href}-${item.label}`} href={item.href} aria-current={item.href === activeHref ? 'page' : undefined}>
                  {item.label}
                </Link>
              ))}
            </nav>

            <details className="site-menu site-menu--mobile">
              <summary className="site-menu__summary" aria-label="メニューを開く">
                <span aria-hidden="true"></span>
                <span className="sr-only">メニュー</span>
              </summary>
              <nav className="site-nav site-nav--mobile" aria-label="主要ナビゲーション">
                {navItems.map((item) => (
                  <Link key={`${item.href}-${item.label}`} href={item.href} aria-current={item.href === activeHref ? 'page' : undefined}>
                    {item.label}
                  </Link>
                ))}
              </nav>
            </details>

            {showHeaderSocials && socialLinks.length ? (
              <div className="site-social" aria-label="SNSリンク">
                {socialLinks.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    target={item.external ? '_blank' : undefined}
                    rel={item.external ? 'noreferrer' : undefined}
                    aria-label={item.label}
                    title={item.label}
                  >
                    <span aria-hidden="true">{item.icon}</span>
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </header>

        <div className="page-stack">{children}</div>

        <footer className="site-footer">
          <div className="site-footer__brand">
            <strong>{name}</strong>
            <p>Juice=Juiceを好きになる入口を、調べて読みやすくまとめています。</p>
          </div>
          <div className="site-footer__links">
            <Link href="/">ホーム</Link>
            <Link href="/diary">ガイド</Link>
            <Link href="/profile">プロフィール</Link>
          </div>
          {socialLinks.length ? (
            <div className="site-footer__social" aria-label="SNSリンク">
              {socialLinks.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  target={item.external ? '_blank' : undefined}
                  rel={item.external ? 'noreferrer' : undefined}
                >
                  {item.label}
                </a>
              ))}
            </div>
          ) : null}
        </footer>
      </div>
    </main>
  );
}
