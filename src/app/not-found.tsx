import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="haki-stage" aria-label="404">
      <p className="domain">覇気.com</p>
      <h1 className="not-found-title">404</h1>
      <Link className="home-link" href="/">
        覇気へ戻る
      </Link>
    </main>
  );
}
