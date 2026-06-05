import Link from 'next/link';
import type { ReactNode } from 'react';
import { AmbientOrb } from '@/components/ambient-orb';
import { siteData } from '@/content/site-data';

const fallbackNav = [
  { href: '/', label: 'ホーム' },
  { href: '/diary', label: '日記' },
  { href: '/profile', label: 'プロフィール' },
  { href: '/world', label: '世界観' },
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

export function SiteShell({ children }: Readonly<{ children: ReactNode }>) {
  const navItems = getNavItems();
  const name = siteData.profile.name;
  const subtitle = 'Diary / profile / city-nocturne archive';
  const socials = Object.values(siteData.socialLinks);

  return (
    <main className="site-shell">
      <AmbientOrb />
      <div className="site-shell__inner">
        <header className="site-header">
          <div className="site-brand">
            <p className="site-note">AMAGIRI MIO OFFICIAL ARCHIVE</p>
            <strong>{name}</strong>
            <span>{subtitle}</span>
          </div>
          <div className="site-header__actions">
            <nav className="site-nav" aria-label="主要ナビゲーション">
              {navItems.map((item) => (
                <Link key={`${item.href}-${item.label}`} href={item.href}>
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="site-socials" aria-label="SNSリンク">
              {socials.map((item) => (
                item.href ? (
                  <a key={item.label} href={item.href} target="_blank" rel="noreferrer">
                    {item.label}
                  </a>
                ) : (
                  <span key={item.label} className="site-socials__item site-socials__item--disabled" aria-disabled="true">
                    {item.label}
                  </span>
                )
              ))}
            </div>
          </div>
        </header>

        <div className="page-stack">{children}</div>

        <footer className="site-footer">
          <p>昼の輪郭と、夜にだけ残る気配をやわらかく束ねた、小さなオフィシャルアーカイブ。</p>
          <div className="site-footer__links">
            <Link href="/diary">日記</Link>
            <Link href="/profile">プロフィール</Link>
            <Link href="/world">世界観</Link>
          </div>
          <div className="site-socials site-socials--footer" aria-label="SNSリンク">
            {socials.map((item) => (
              item.href ? (
                <a key={item.label} href={item.href} target="_blank" rel="noreferrer">
                  {item.label}
                </a>
              ) : (
                <span key={item.label} className="site-socials__item site-socials__item--disabled" aria-disabled="true">
                  {item.label}
                </span>
              )
            ))}
          </div>
        </footer>
      </div>
    </main>
  );
}
