import Link from 'next/link';
import type { ReactNode } from 'react';
import { AmbientOrb } from '@/components/ambient-orb';
import { siteData } from '@/content/site-data';

const fallbackNav = [
  { href: '/', label: 'ホーム' },
  { href: '/diary', label: '日記' },
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
}>;

export function SiteShell({ children, variant = 'default' }: SiteShellProps) {
  const navItems = getNavItems();
  const name = siteData.profile.name;
  const subtitle = variant === 'home' ? 'Juice=Juice 日記' : 'Juice=Juice / diary / profile';
  const socialLinks = Array.isArray(siteData.socialLinks) ? siteData.socialLinks.slice(0, 2) : [];
  const showChromeSocials = variant !== 'home';
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
            <nav className="site-nav" aria-label="主要ナビゲーション">
              {navItems.map((item) => (
                <Link key={`${item.href}-${item.label}`} href={item.href}>
                  {item.label}
                </Link>
              ))}
            </nav>

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
          <p>最近Juice=Juiceにハマりました。知らない曲をひとつずつ見つけています。</p>
          <div className="site-footer__links">
            <Link href="/diary">日記</Link>
            <Link href="/profile">プロフィール</Link>
          </div>
          {showChromeSocials && socialLinks.length ? (
            <div className="site-footer__social" aria-label="SNSリンク">
              {socialLinks.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  target={item.external ? '_blank' : undefined}
                  rel={item.external ? 'noreferrer' : undefined}
                >
                  {item.icon} {item.label}
                </a>
              ))}
            </div>
          ) : null}
        </footer>
      </div>
    </main>
  );
}
