import Link from 'next/link';
import { SiteShell } from '@/components/site-shell';

export default function NotFound() {
  return (
    <SiteShell>
      <section className="hero-card compact-hero">
        <p className="eyebrow">404</p>
        <h1>記録が見つかりません</h1>
        <p className="hero-summary">探していたページは、観測の外側へ静かに流れていきました。</p>
        <Link className="inline-link" href="/">
          ホームへ戻る
        </Link>
      </section>
    </SiteShell>
  );
}
