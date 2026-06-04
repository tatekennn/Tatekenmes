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
  const subtitle = '東京の夕暮れに残る、静かな観測記録';

  return (
    <main className="site-shell">
      <AmbientOrb />
      <div className="site-shell__inner">
        <header className="site-header">
          <div className="site-brand">
            <strong>{name}</strong>
            <span>{subtitle}</span>
          </div>
          <nav className="site-nav" aria-label="主要ナビゲーション">
            {navItems.map((item) => (
              <Link key={`${item.href}-${item.label}`} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
        </header>

        <div className="page-stack">{children}</div>

        <footer className="site-footer">
          <p>記録は、見失わないために静かに残されています。</p>
        </footer>
      </div>
    </main>
  );
}
